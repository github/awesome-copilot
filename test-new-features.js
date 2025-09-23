#!/usr/bin/env node

/**
 * Tests for new features added to awesome-copilot
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Change to project directory for tests
process.chdir(__dirname);

const TEST_CONFIG = 'test-new-features.yml';
const TEST_OUTPUT_DIR = '.test-new-features-awesome-copilot';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function cleanup() {
  try {
    if (fs.existsSync(TEST_CONFIG)) {
      fs.unlinkSync(TEST_CONFIG);
    }
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}

async function runCommand(command) {
  try {
    const { stdout, stderr } = await execAsync(command);
    return { success: true, stdout, stderr };
  } catch (error) {
    return { success: false, stdout: error.stdout || '', stderr: error.stderr || '', error };
  }
}

function setTestOutputDir(configFile) {
  if (fs.existsSync(configFile)) {
    let content = fs.readFileSync(configFile, 'utf8');
    content = content.replace(/output_directory: "\.github"/, `output_directory: "${TEST_OUTPUT_DIR}"`);
    fs.writeFileSync(configFile, content);
  }
}

async function runTests() {
  console.log('Running tests for new awesome-copilot features...\n');
  
  let passedTests = 0;
  let totalTests = 0;

  async function test(name, testFn) {
    totalTests++;
    try {
      cleanup(); // Clean up before each test
      await testFn();
      console.log(`✅ ${name}`);
      passedTests++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
    }
  }

  // Test 1: Reset command
  await test("Reset command clears output directory", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    setTestOutputDir(TEST_CONFIG);
    
    // Enable something and apply
    await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);
    await runCommand(`node awesome-copilot.js apply ${TEST_CONFIG}`);
    
    // Check files exist
    const filesBefore = fs.readdirSync(TEST_OUTPUT_DIR, { recursive: true });
    assert(filesBefore.some(f => f.includes('.md')), 'Should have some files before reset');
    
    // Reset
    const resetResult = await runCommand(`node awesome-copilot.js reset ${TEST_CONFIG}`);
    assert(resetResult.success, 'Reset should succeed');
    
    // Check files are gone but directories remain
    assert(fs.existsSync(TEST_OUTPUT_DIR), 'Output directory should still exist');
    assert(fs.existsSync(path.join(TEST_OUTPUT_DIR, 'prompts')), 'Prompts directory should still exist');
    const filesAfter = fs.readdirSync(TEST_OUTPUT_DIR, { recursive: true });
    assert(!filesAfter.some(f => f.includes('.md')), 'Should have no .md files after reset');
  });

  // Test 2: --apply flag
  await test("--apply flag automatically applies after toggle", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    setTestOutputDir(TEST_CONFIG);
    
    // Toggle with --apply flag
    const result = await runCommand(`node awesome-copilot.js toggle collections testing-automation on --apply --config ${TEST_CONFIG}`);
    assert(result.success, 'Toggle with --apply should succeed');
    assert(result.stdout.includes('Applying configuration automatically'), 'Should show auto-apply message');
    
    // Check files were applied
    const files = fs.readdirSync(TEST_OUTPUT_DIR, { recursive: true });
    assert(files.some(f => f.includes('.md')), 'Files should be automatically applied');
  });

  // Test 3: --all flag force overrides
  await test("--all flag overrides explicit settings", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    
    // Set explicit false
    await runCommand(`node awesome-copilot.js toggle prompts create-readme off --config ${TEST_CONFIG}`);
    
    // Check it's explicitly disabled
    const listResult1 = await runCommand(`node awesome-copilot.js list prompts --config ${TEST_CONFIG}`);
    assert(listResult1.stdout.includes('create-readme (explicit)'), 'Should show explicit disabled');
    
    // Force enable all with --all flag
    await runCommand(`node awesome-copilot.js toggle prompts all on --all --config ${TEST_CONFIG}`);
    
    // Check it's now explicitly enabled
    const listResult2 = await runCommand(`node awesome-copilot.js list prompts --config ${TEST_CONFIG}`);
    assert(listResult2.stdout.includes('create-readme (explicit)') && listResult2.stdout.includes('[✓]'), 'Should be explicitly enabled');
  });

  // Test 4: File cleanup on disable
  await test("Files are removed when items are disabled", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    setTestOutputDir(TEST_CONFIG);
    
    // Enable and apply
    await runCommand(`node awesome-copilot.js toggle collections testing-automation on --apply --config ${TEST_CONFIG}`);
    
    const filesBefore = fs.readdirSync(TEST_OUTPUT_DIR, { recursive: true });
    assert(filesBefore.some(f => f.includes('.md')), 'Should have files after enable');
    
    // Disable and apply
    await runCommand(`node awesome-copilot.js toggle collections testing-automation off --apply --config ${TEST_CONFIG}`);
    
    const filesAfter = fs.readdirSync(TEST_OUTPUT_DIR, { recursive: true });
    assert(!filesAfter.some(f => f.includes('.md')), 'Should have no files after disable');
  });

  // Test 5: Idempotency with file content checking
  await test("Idempotency checks file content correctly", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    setTestOutputDir(TEST_CONFIG);
    
    // Enable and apply
    await runCommand(`node awesome-copilot.js toggle collections testing-automation on --apply --config ${TEST_CONFIG}`);
    
    // Apply again (should show already up-to-date)
    const result = await runCommand(`node awesome-copilot.js apply ${TEST_CONFIG}`);
    assert(result.stdout.includes('Already exists and up-to-date'), 'Should show idempotency message');
    assert(!result.stdout.includes('Copied:'), 'Should not copy any files');
  });

  // Test 6: Explicit overrides preserved across collection toggles
  await test("Explicit overrides preserved across collection toggles", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    
    // Enable collection
    await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);
    
    // Set explicit override
    await runCommand(`node awesome-copilot.js toggle prompts playwright-generate-test off --config ${TEST_CONFIG}`);
    
    // Toggle collection off and on
    await runCommand(`node awesome-copilot.js toggle collections testing-automation off --config ${TEST_CONFIG}`);
    const toggleResult = await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);
    
    // Check that the explicit override is preserved (playwright-generate-test should NOT be in enabled list)
    assert(!toggleResult.stdout.includes('playwright-generate-test'), 'Explicit override should be preserved');
    
    // Double-check with list command
    const listResult = await runCommand(`node awesome-copilot.js list prompts --config ${TEST_CONFIG}`);
    assert(listResult.stdout.includes('playwright-generate-test (explicit)'), "'playwright-generate-test (explicit)' should be present in the list output");
    assert(!listResult.stdout.includes('[✓] playwright-generate-test'), "'[✓] playwright-generate-test' should NOT be present in the list output (should remain explicitly disabled)");
  });

  console.log(`\nNew Features Test Results: ${passedTests}/${totalTests} passed`);
  
  cleanup(); // Final cleanup
  
  if (passedTests === totalTests) {
    console.log('🎉 All new features tests passed!');
    return true;
  } else {
    console.log('💥 Some new features tests failed!');
    return false;
  }
}

if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test runner error:', error);
    cleanup();
    process.exit(1);
  });
}

module.exports = { runTests };