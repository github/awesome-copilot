#!/usr/bin/env node

/**
 * Unit tests for toggleCollection function
 */

const path = require('path');
const { toggleCollection, computeEffectiveItemStates } = require('./config-manager');

// Change to project directory for tests
process.chdir(__dirname);

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTests() {
  let totalTests = 0;
  let passedTests = 0;

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

  console.log("Running unit tests for toggleCollection function...\n");

  // Test 1: Toggle collection from false to true
  test("Toggle collection from false to true", () => {
    const config = {
      collections: {
        'testing-automation': false
      }
    };
    
    const result = toggleCollection(config, 'testing-automation', true);
    
    assert(result.changed === true, 'Should indicate change occurred');
    assert(result.collectionName === 'testing-automation', 'Should return correct collection name');
    assert(result.currentState === false, 'Should show previous state as false');
    assert(result.newState === true, 'Should show new state as true');
    assert(config.collections['testing-automation'] === true, 'Config should be updated');
    assert(result.delta.enabled.length > 0, 'Should show items being enabled');
  });

  // Test 2: Toggle collection from true to false
  test("Toggle collection from true to false", () => {
    const config = {
      collections: {
        'testing-automation': true
      }
    };
    
    const result = toggleCollection(config, 'testing-automation', false);
    
    assert(result.changed === true, 'Should indicate change occurred');
    assert(result.newState === false, 'Should show new state as false');
    assert(config.collections['testing-automation'] === false, 'Config should be updated');
    assert(result.delta.disabled.length > 0, 'Should show items being disabled');
  });

  // Test 3: Toggle collection to same state (no change)
  test("Toggle collection to same state (no change)", () => {
    const config = {
      collections: {
        'testing-automation': true
      }
    };
    
    const result = toggleCollection(config, 'testing-automation', true);
    
    assert(result.changed === false, 'Should indicate no change occurred');
    assert(result.message.includes('already enabled'), 'Should indicate already enabled');
  });

  // Test 4: Preserves explicit overrides
  test("Preserves explicit overrides", () => {
    const config = {
      prompts: {
        'playwright-generate-test': false  // Explicit override
      },
      collections: {
        'testing-automation': false
      }
    };
    
    // Enable collection
    const result = toggleCollection(config, 'testing-automation', true);
    
    // Verify the explicit override is preserved
    assert(config.prompts['playwright-generate-test'] === false, 'Explicit override should be preserved');
    assert(config.collections['testing-automation'] === true, 'Collection should be enabled');
    
    // Check that the overridden item is not in the enabled delta
    const hasOverriddenItem = result.delta.enabled.some(item => item.includes('playwright-generate-test'));
    assert(!hasOverriddenItem, 'Explicitly disabled item should not appear in enabled delta');
  });

  // Test 5: Only modifies collection flag, never individual items
  test("Only modifies collection flag, never individual items", () => {
    const config = {
      prompts: {},
      instructions: {},
      chatmodes: {},
      collections: {
        'testing-automation': false
      }
    };
    
    const originalPrompts = { ...config.prompts };
    const originalInstructions = { ...config.instructions };
    const originalChatmodes = { ...config.chatmodes };
    
    toggleCollection(config, 'testing-automation', true);
    
    // Verify individual sections were not modified
    assert(JSON.stringify(config.prompts) === JSON.stringify(originalPrompts), 'Prompts section should not be modified');
    assert(JSON.stringify(config.instructions) === JSON.stringify(originalInstructions), 'Instructions section should not be modified');
    assert(JSON.stringify(config.chatmodes) === JSON.stringify(originalChatmodes), 'Chatmodes section should not be modified');
    
    // Only collections should be modified
    assert(config.collections['testing-automation'] === true, 'Only collection flag should be modified');
  });

  // Test 6: Error handling for invalid inputs
  test("Error handling for invalid inputs", () => {
    let errorThrown = false;
    
    try {
      toggleCollection(null, 'test', true);
    } catch (error) {
      errorThrown = true;
      assert(error.message.includes('Config object is required'), 'Should require config object');
    }
    assert(errorThrown, 'Should throw error for null config');
    
    errorThrown = false;
    try {
      toggleCollection({}, '', true);
    } catch (error) {
      errorThrown = true;
      assert(error.message.includes('Collection name is required'), 'Should require collection name');
    }
    assert(errorThrown, 'Should throw error for empty name');
    
    errorThrown = false;
    try {
      toggleCollection({}, 'test', 'not-boolean');
    } catch (error) {
      errorThrown = true;
      assert(error.message.includes('Enabled state must be a boolean'), 'Should require boolean enabled state');
    }
    assert(errorThrown, 'Should throw error for non-boolean enabled state');
  });

  // Test 7: Error handling for non-existent collection
  test("Error handling for non-existent collection", () => {
    const config = { collections: {} };
    
    let errorThrown = false;
    try {
      toggleCollection(config, 'non-existent-collection', true);
    } catch (error) {
      errorThrown = true;
      assert(error.message.includes('does not exist'), 'Should indicate collection does not exist');
    }
    assert(errorThrown, 'Should throw error for non-existent collection');
  });

  console.log(`\nTest Results: ${passedTests}/${totalTests} passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All toggleCollection tests passed!');
    return true;
  } else {
    console.log('💥 Some toggleCollection tests failed!');
    return false;
  }
}

if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests };