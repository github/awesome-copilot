#!/usr/bin/env node

/**
 * CLI tests for list and toggle commands
 */

const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Change to project directory for tests
process.chdir(__dirname);

const TEST_CONFIG = 'test-cli.yml';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function cleanup() {
  if (fs.existsSync(TEST_CONFIG)) fs.unlinkSync(TEST_CONFIG);
}

async function runCommand(command) {
  try {
    const { stdout, stderr } = await execAsync(command);
    return { success: true, stdout, stderr };
  } catch (error) {
    return { success: false, stdout: error.stdout, stderr: error.stderr, error };
  }
}

async function runTests() {
  console.log('Running CLI tests for list and toggle commands...\n');
  
  let passedTests = 0;
  let totalTests = 0;

  async function test(name, testFn) {
    totalTests++;
    cleanup(); // Clean up before each test
    
    try {
      await testFn();
      console.log(`✅ ${name}`);
      passedTests++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
    }
  }

  // Test 1: List command shows sections correctly
  await test("List command shows sections correctly", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    
    const result = await runCommand(`node awesome-copilot.js list --config ${TEST_CONFIG}`);
    assert(result.success, 'List command should succeed');
    assert(result.stdout.includes('Prompts'), 'Should show Prompts section');
    assert(result.stdout.includes('Instructions'), 'Should show Instructions section');
    assert(result.stdout.includes('Chat Modes'), 'Should show Chat Modes section');
    assert(result.stdout.includes('Collections'), 'Should show Collections section');
  });

  // Test 2: List specific section works
  await test("List specific section works", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    
    const result = await runCommand(`node awesome-copilot.js list prompts --config ${TEST_CONFIG}`);
    assert(result.success, 'List prompts should succeed');
    assert(result.stdout.includes('Prompts'), 'Should show Prompts heading');
    assert(!result.stdout.includes('Instructions'), 'Should not show other sections');
  });

  // Test 3: Toggle collection shows delta summary
  await test("Toggle collection shows delta summary", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    
    const result = await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);
    assert(result.success, 'Toggle should succeed');
    assert(result.stdout.includes('Delta summary'), 'Should show delta summary');
    assert(result.stdout.includes('items will be enabled'), 'Should show enabled items count');
  });

  // Test 4: List shows effective states after collection toggle
  await test("List shows effective states after collection toggle", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);
    
    const result = await runCommand(`node awesome-copilot.js list prompts --config ${TEST_CONFIG}`);
    assert(result.success, 'List should succeed');
    assert(result.stdout.includes('(collection)'), 'Should show collection reason');
    assert(result.stdout.includes('[✓]'), 'Should show enabled items');
  });

  // Test 5: Toggle individual item shows explicit override
  await test("Toggle individual item shows explicit override", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);
    
    const result = await runCommand(`node awesome-copilot.js toggle prompts playwright-generate-test off --config ${TEST_CONFIG}`);
    assert(result.success, 'Individual toggle should succeed');
    
    const listResult = await runCommand(`node awesome-copilot.js list prompts --config ${TEST_CONFIG}`);
    assert(listResult.stdout.includes('playwright-generate-test (explicit)'), 
           'Explicitly disabled item should show explicit reason');
  });

  // Test 6: Error handling for invalid commands
  await test("Error handling for invalid commands", async () => {
    const result1 = await runCommand(`node awesome-copilot.js toggle --config ${TEST_CONFIG}`);
    assert(!result1.success, 'Should fail with insufficient arguments');

    const result2 = await runCommand(`node awesome-copilot.js toggle prompts nonexistent on --config ${TEST_CONFIG}`);
    assert(!result2.success, 'Should fail with nonexistent item');
  });

  // Test 7: Collection toggle idempotency
  await test("Collection toggle idempotency", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);
    
    const result = await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);
    assert(result.success, 'Should succeed');
    assert(result.stdout.includes('already enabled'), 'Should indicate no change needed');
  });

  // Test 8: Multiple collections effective states
  await test("Multiple collections effective states", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    
    // Enable two collections with potential overlap
    await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);
    await runCommand(`node awesome-copilot.js toggle collections csharp-dotnet-development on --config ${TEST_CONFIG}`);
    
    const result = await runCommand(`node awesome-copilot.js list prompts --config ${TEST_CONFIG}`);
    assert(result.success, 'List should succeed');
    
    // Should show collection reason for items enabled by collection
    assert(result.stdout.includes('(collection)'), 'Should show collection reason');
    assert(result.stdout.includes('[✓]'), 'Should show enabled items');
    
    // Count should reflect enabled items from both collections
    const enabledMatch = result.stdout.match(/Prompts \((\d+)\/\d+ enabled\)/);
    assert(enabledMatch && parseInt(enabledMatch[1]) > 5, 'Should have multiple enabled prompts from collections');
  });

  // Test 9: Explicit overrides with collection conflicts
  await test("Explicit overrides with collection conflicts", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);
    
    // Override a collection item explicitly to off
    await runCommand(`node awesome-copilot.js toggle prompts playwright-generate-test off --config ${TEST_CONFIG}`);
    
    const listResult = await runCommand(`node awesome-copilot.js list prompts --config ${TEST_CONFIG}`);
    assert(listResult.success, 'List should succeed');
    
    // Should show explicit reason and disabled state
    assert(listResult.stdout.includes('playwright-generate-test (explicit)'), 'Should show explicit reason');
    assert(listResult.stdout.includes('[ ] playwright-generate-test'), 'Should show as disabled despite collection');
    
    // Other collection items should still show as enabled
    assert(listResult.stdout.includes('[✓] playwright-explore-website (collection)'), 'Other collection items should remain enabled');
  });

  // Test 10: Delta summary accuracy with conflicts
  await test("Delta summary accuracy with conflicts", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    
    // Enable collection
    await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);
    
    // Add explicit override to disable one item
    await runCommand(`node awesome-copilot.js toggle prompts playwright-generate-test off --config ${TEST_CONFIG}`);
    
    // Disable the collection - should show accurate delta excluding explicit override
    const result = await runCommand(`node awesome-copilot.js toggle collections testing-automation off --config ${TEST_CONFIG}`);
    assert(result.success, 'Toggle should succeed');
    assert(result.stdout.includes('Delta summary'), 'Should show delta summary');
    assert(result.stdout.includes('items will be disabled'), 'Should show disabled items count');
    
    // Should not include the explicitly disabled item in the delta
    const lines = result.stdout.split('\n');
    const disabledItems = lines.filter(line => line.includes('    - prompts/'));
    assert(!disabledItems.some(line => line.includes('playwright-generate-test')), 
           'Should not show explicitly disabled item in delta');
  });

  // Test 11: Instructions and chatmodes effective states
  await test("Instructions and chatmodes effective states", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);
    
    // Test instructions
    const instructionsResult = await runCommand(`node awesome-copilot.js list instructions --config ${TEST_CONFIG}`);
    assert(instructionsResult.success, 'Instructions list should succeed');
    assert(instructionsResult.stdout.includes('[✓] playwright-typescript (collection)'), 
           'Instructions should show collection reason');
    
    // Test chatmodes
    const chatmodesResult = await runCommand(`node awesome-copilot.js list chatmodes --config ${TEST_CONFIG}`);
    assert(chatmodesResult.success, 'Chatmodes list should succeed');
    assert(chatmodesResult.stdout.includes('[✓] tdd-red (collection)'), 
           'Chatmodes should show collection reason');
  });

  // Test 12: Collections section display
  await test("Collections section shows simple enabled/disabled", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);
    
    const result = await runCommand(`node awesome-copilot.js list collections --config ${TEST_CONFIG}`);
    assert(result.success, 'Collections list should succeed');
    assert(result.stdout.includes('[✓] testing-automation'), 'Should show enabled collection');
    assert(result.stdout.includes('[ ] csharp-dotnet-development'), 'Should show disabled collection');
    
    // Collections should not show reasons (unlike other sections)
    assert(!result.stdout.includes('(explicit)'), 'Collections should not show reason text');
    assert(!result.stdout.includes('(collection)'), 'Collections should not show reason text');
  });

  // Test 13: Output clarity and user-friendliness
  await test("Output clarity and user-friendliness", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);
    
    const result = await runCommand(`node awesome-copilot.js list --config ${TEST_CONFIG}`);
    assert(result.success, 'List should succeed');
    
    // Should show counts (character estimates may or may not appear depending on content)
    assert(result.stdout.includes('enabled'), 'Should show enabled counts');
    
    // Should show helpful usage message
    assert(result.stdout.includes("Use 'awesome-copilot toggle'"), 'Should show usage instructions');
    
    // Should show clear section headers
    assert(result.stdout.includes('Prompts'), 'Should show Prompts section');
    assert(result.stdout.includes('Instructions'), 'Should show Instructions section');
    assert(result.stdout.includes('Chat Modes'), 'Should show Chat Modes section');
    assert(result.stdout.includes('Collections'), 'Should show Collections section');
    
    // Should show configuration path
    assert(result.stdout.includes('Configuration:'), 'Should show configuration file path');
  });

  // Test 14: Complex scenario with multiple overrides
  await test("Complex scenario with multiple overrides", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    
    // Enable multiple collections
    await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);
    await runCommand(`node awesome-copilot.js toggle collections csharp-dotnet-development on --config ${TEST_CONFIG}`);
    
    // Add explicit overrides
    await runCommand(`node awesome-copilot.js toggle prompts playwright-generate-test off --config ${TEST_CONFIG}`);
    await runCommand(`node awesome-copilot.js toggle prompts create-readme on --config ${TEST_CONFIG}`);
    
    const result = await runCommand(`node awesome-copilot.js list prompts --config ${TEST_CONFIG}`);
    assert(result.success, 'List should succeed');
    
    // Should show mixed states with correct reasons
    assert(result.stdout.includes('[ ] playwright-generate-test (explicit)'), 'Should show explicit disable');
    assert(result.stdout.includes('[✓] create-readme (explicit)'), 'Should show explicit enable');
    assert(result.stdout.includes('(collection)'), 'Should show collection-enabled items');
    
    // Count should be accurate
    const enabledMatch = result.stdout.match(/Prompts \((\d+)\/\d+ enabled\)/);
    assert(enabledMatch, 'Should show enabled count');
    
    const enabledCount = parseInt(enabledMatch[1]);
    assert(enabledCount > 8, 'Should have multiple items enabled from collections and explicit');
  });

  // Test 15: No misleading disabled messages for shared items
  await test("No misleading disabled messages for shared items", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    
    // Enable a collection that has items potentially shared with other collections
    await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);
    
    // Toggle collection off and check delta summary
    const result = await runCommand(`node awesome-copilot.js toggle collections testing-automation off --config ${TEST_CONFIG}`);
    assert(result.success, 'Toggle should succeed');
    
    // Should show accurate delta - items should be listed as will be disabled
    // since they're not enabled by other collections in this test
    assert(result.stdout.includes('Delta summary'), 'Should show delta summary');
    assert(result.stdout.includes('items will be disabled'), 'Should show disabled items count');
    
    // Verify the messaging is clear and not misleading
    const lines = result.stdout.split('\n');
    const deltaLines = lines.filter(line => line.includes('+ ') || line.includes('- '));
    assert(deltaLines.length > 0, 'Should show specific items in delta');
  });

  // Test 16: Membership and counts verification
  await test("Membership and counts verification", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    
    // Enable collection and add explicit overrides
    await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);
    await runCommand(`node awesome-copilot.js toggle prompts playwright-generate-test off --config ${TEST_CONFIG}`);
    await runCommand(`node awesome-copilot.js toggle prompts create-readme on --config ${TEST_CONFIG}`);
    
    // Get all section results
    const promptsResult = await runCommand(`node awesome-copilot.js list prompts --config ${TEST_CONFIG}`);
    const instructionsResult = await runCommand(`node awesome-copilot.js list instructions --config ${TEST_CONFIG}`);
    const chatmodesResult = await runCommand(`node awesome-copilot.js list chatmodes --config ${TEST_CONFIG}`);
    
    // Verify counts are accurate and consistent
    const promptsMatch = promptsResult.stdout.match(/Prompts \((\d+)\/(\d+) enabled\)/);
    const instructionsMatch = instructionsResult.stdout.match(/Instructions \((\d+)\/(\d+) enabled\)/);
    const chatmodesMatch = chatmodesResult.stdout.match(/Chat Modes \((\d+)\/(\d+) enabled\)/);
    
    assert(promptsMatch, 'Should show prompts count');
    assert(instructionsMatch, 'Should show instructions count');  
    assert(chatmodesMatch, 'Should show chatmodes count');
    
    // Counts should be reasonable for testing-automation collection
    assert(parseInt(promptsMatch[1]) >= 4, 'Should have reasonable prompts enabled');
    assert(parseInt(instructionsMatch[1]) >= 2, 'Should have reasonable instructions enabled');
    assert(parseInt(chatmodesMatch[1]) >= 3, 'Should have reasonable chatmodes enabled');
    
    // Total items should be consistent
    assert(parseInt(promptsMatch[2]) > 80, 'Should show total prompts available');
    assert(parseInt(instructionsMatch[2]) > 70, 'Should show total instructions available');
    assert(parseInt(chatmodesMatch[2]) > 50, 'Should show total chatmodes available');
  });

  console.log(`\nCLI Test Results: ${passedTests}/${totalTests} passed`);
  
  cleanup(); // Final cleanup
  
  if (passedTests === totalTests) {
    console.log('🎉 All CLI tests passed!');
    return true;
  } else {
    console.log('💥 Some CLI tests failed!');
    return false;
  }
}

if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('CLI test runner error:', error);
    cleanup();
    process.exit(1);
  });
}

module.exports = { runTests };