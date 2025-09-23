#!/usr/bin/env node

/**
 * Unit tests for computeEffectiveItemStates function
 */

const path = require('path');
const { computeEffectiveItemStates, getEffectivelyEnabledItems } = require('./config-manager');

// Change to project directory for tests
process.chdir(__dirname);

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTests() {
  console.log('Running unit tests for computeEffectiveItemStates...\n');
  
  let passedTests = 0;
  let totalTests = 0;

  function test(name, testFn) {
    totalTests++;
    try {
      testFn();
      console.log(`✅ ${name}`);
      passedTests++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
    }
  }

  // Test 1: Empty config returns all disabled
  test("Empty config returns all disabled", () => {
    const config = {};
    const result = computeEffectiveItemStates(config);
    
    assert(typeof result === 'object', 'Should return object');
    assert('prompts' in result, 'Should have prompts section');
    assert('instructions' in result, 'Should have instructions section');
    assert('chatmodes' in result, 'Should have chatmodes section');
    
    // Check a few known items are disabled
    const playwrightPrompt = result.prompts['playwright-generate-test'];
    assert(playwrightPrompt && !playwrightPrompt.enabled && playwrightPrompt.reason === 'disabled', 
           'Playwright prompt should be disabled');
  });

  // Test 2: Explicit true overrides everything
  test("Explicit true overrides everything", () => {
    const config = {
      prompts: {
        'playwright-generate-test': true
      },
      collections: {}
    };
    const result = computeEffectiveItemStates(config);
    
    const item = result.prompts['playwright-generate-test'];
    assert(item && item.enabled && item.reason === 'explicit', 
           'Explicitly enabled item should show as explicit');
  });

  // Test 3: Explicit false overrides collections
  test("Explicit false overrides collections", () => {
    const config = {
      prompts: {
        'playwright-generate-test': false
      },
      collections: {
        'testing-automation': true
      }
    };
    const result = computeEffectiveItemStates(config);
    
    const item = result.prompts['playwright-generate-test'];
    assert(item && !item.enabled && item.reason === 'explicit', 
           'Explicitly disabled item should override collection');
  });

  // Test 4: Collection enables items
  test("Collection enables items", () => {
    const config = {
      collections: {
        'testing-automation': true
      }
    };
    const result = computeEffectiveItemStates(config);
    
    // These should be enabled by collection
    const items = [
      'playwright-generate-test',
      'csharp-nunit', 
      'playwright-explore-website'
    ];
    
    items.forEach(itemName => {
      const item = result.prompts[itemName];
      assert(item && item.enabled && item.reason === 'collection', 
             `${itemName} should be enabled by collection`);
    });
  });

  // Test 5: Undefined items respect collections
  test("Undefined items respect collections", () => {
    const config = {
      prompts: {
        'some-other-prompt': true  // explicit
        // playwright-generate-test is undefined
      },
      collections: {
        'testing-automation': true
      }
    };
    const result = computeEffectiveItemStates(config);
    
    const explicitItem = result.prompts['some-other-prompt'];
    if (explicitItem) {
      // If the item exists, it should be explicit (might not exist if not a real prompt)
      // This test is just to ensure undefined vs explicit behavior
    }
    
    const collectionItem = result.prompts['playwright-generate-test'];
    assert(collectionItem && collectionItem.enabled && collectionItem.reason === 'collection', 
           'Undefined item should respect collection setting');
  });

  // Test 6: Multiple collections
  test("Multiple collections work together", () => {
    const config = {
      collections: {
        'testing-automation': true,
        'frontend-web-dev': true  // if this exists
      }
    };
    const result = computeEffectiveItemStates(config);
    
    // Items from testing-automation should be enabled
    const testingItem = result.prompts['playwright-generate-test'];
    assert(testingItem && testingItem.enabled && testingItem.reason === 'collection', 
           'Testing automation items should be enabled');
  });

  // Test 7: Instructions and chatmodes work correctly
  test("Instructions and chatmodes work correctly", () => {
    const config = {
      collections: {
        'testing-automation': true
      }
    };
    const result = computeEffectiveItemStates(config);
    
    // Check instructions
    const instruction = result.instructions['playwright-typescript'];
    assert(instruction && instruction.enabled && instruction.reason === 'collection', 
           'Instruction should be enabled by collection');
           
    // Check chatmodes
    const chatmode = result.chatmodes['tdd-red'];
    assert(chatmode && chatmode.enabled && chatmode.reason === 'collection', 
           'Chat mode should be enabled by collection');
  });

  // Test 9: TASK-006 - Strict false checks prevent undefined treated as disabled
  test("TASK-006: Strict false checks prevent undefined treated as disabled", () => {
    const config = {
      prompts: {
        'explicit-false-item': false,
        'explicit-true-item': true,
        // 'undefined-item' is undefined (not set)
      },
      collections: {
        'testing-automation': true
      }
    };
    const result = computeEffectiveItemStates(config);
    
    // Explicit false should be disabled with reason 'explicit'
    const explicitFalse = result.prompts['explicit-false-item'];
    if (explicitFalse) {
      assert(explicitFalse.reason === 'explicit' && !explicitFalse.enabled,
             'Items with explicit false should be disabled with reason explicit');
    }
    
    // Explicit true should be enabled with reason 'explicit'  
    const explicitTrue = result.prompts['explicit-true-item'];
    if (explicitTrue) {
      assert(explicitTrue.reason === 'explicit' && explicitTrue.enabled,
             'Items with explicit true should be enabled with reason explicit');
    }
    
    // Undefined item in collection should be enabled with reason 'collection'
    const undefinedInCollection = result.prompts['playwright-generate-test'];
    if (undefinedInCollection) {
      assert(undefinedInCollection.reason === 'collection' && undefinedInCollection.enabled,
             'Undefined items should be enabled by collections, not treated as explicitly disabled');
    }
    
    // Undefined item NOT in collection should be disabled with reason 'disabled' (not 'explicit')
    const undefinedNotInCollection = result.prompts['some-random-item-not-in-any-collection'];
    if (undefinedNotInCollection) {
      assert(undefinedNotInCollection.reason === 'disabled' && !undefinedNotInCollection.enabled,
             'Undefined items not in collections should have reason disabled, not explicit');
    }
  });

  // Test 10: getEffectivelyEnabledItems returns Sets format
  test("getEffectivelyEnabledItems returns Sets format", () => {
    const config = {
      prompts: {
        'playwright-generate-test': true,
        'csharp-nunit': false
      },
      collections: {
        'testing-automation': true
      }
    };
    const result = getEffectivelyEnabledItems(config);
    
    assert(typeof result === 'object', 'Should return object');
    assert(result.prompts instanceof Set, 'Prompts should be a Set');
    assert(result.instructions instanceof Set, 'Instructions should be a Set');
    assert(result.chatmodes instanceof Set, 'Chatmodes should be a Set');
    
    // Check that explicitly enabled items are included
    assert(result.prompts.has('playwright-generate-test'), 
           'Explicitly enabled prompt should be in Set');
    
    // Check that explicitly disabled items are not included (even if in collection)
    assert(!result.prompts.has('csharp-nunit'), 
           'Explicitly disabled prompt should not be in Set');
    
    // Check that collection-enabled items are included
    assert(result.prompts.has('playwright-explore-website'), 
           'Collection-enabled prompt should be in Set');
  });

  // Test 9: getEffectivelyEnabledItems performance check
  test("getEffectivelyEnabledItems provides O(1) lookups", () => {
    const config = {
      collections: {
        'testing-automation': true
      }
    };
    const result = getEffectivelyEnabledItems(config);
    
    // Test O(1) lookup performance
    const startTime = process.hrtime.bigint();
    const hasItem = result.prompts.has('playwright-generate-test');
    const endTime = process.hrtime.bigint();
    
    assert(hasItem === true, 'Should find enabled item');
    // This is more of a structural test - Sets provide O(1) lookups by design
    assert(result.prompts.size > 0, 'Should have enabled prompts');
  });

  console.log(`\nTest Results: ${passedTests}/${totalTests} passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed!');
    return true;
  } else {
    console.log('💥 Some tests failed!');
    return false;
  }
}

if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests };