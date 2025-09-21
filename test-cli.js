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
    assert(listResult.stdout.includes('playwright-generate-test') && !listResult.stdout.includes('playwright-generate-test ('), 
           'Explicitly disabled item should not show reason');
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