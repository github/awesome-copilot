#!/usr/bin/env node

/**
 * Integration tests for toggle+apply idempotency
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Change to project directory for tests
process.chdir(__dirname);

const TEST_CONFIG = 'test-integration.yml';
const TEST_OUTPUT_DIR = '.test-awesome-copilot';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function cleanup() {
  // Remove test files
  if (fs.existsSync(TEST_CONFIG)) fs.unlinkSync(TEST_CONFIG);
  if (fs.existsSync(TEST_OUTPUT_DIR)) {
    fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
  }
}

async function runCommand(command) {
  try {
    const { stdout, stderr } = await execAsync(command);
    return { success: true, stdout, stderr };
  } catch (error) {
    return { success: false, stdout: error.stdout, stderr: error.stderr, error };
  }
}

function getFilesList(dir) {
  if (!fs.existsSync(dir)) return [];

  const files = [];
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        traverse(fullPath);
      } else {
        files.push(path.relative(dir, fullPath));
      }
    }
  }
  traverse(dir);
  return files.sort();
}

function setTestOutputDir(configFile) {
  let configContent = fs.readFileSync(configFile, 'utf8');
  configContent = configContent.replace(/output_directory:\s*".*?"/, `output_directory: "${TEST_OUTPUT_DIR}"`);
  fs.writeFileSync(configFile, configContent);
}

async function runTests() {
  console.log('Running integration tests for toggle+apply idempotency...\n');

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

  // Test 1: Basic toggle+apply idempotency
  await test("Basic toggle+apply idempotency", async () => {
    // Create initial config
    const result1 = await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    assert(result1.success, 'Should create initial config');
    setTestOutputDir(TEST_CONFIG);

    // Enable a collection
    const result2 = await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);
    assert(result2.success, 'Should enable collection');

    // First apply
    const result3 = await runCommand(`node awesome-copilot.js apply ${TEST_CONFIG}`);
    assert(result3.success, 'First apply should succeed');

    const files1 = getFilesList(TEST_OUTPUT_DIR);
    assert(files1.length > 0, 'Should have copied files');

    // Second apply (idempotency test)
    const result4 = await runCommand(`node awesome-copilot.js apply ${TEST_CONFIG}`);
    assert(result4.success, 'Second apply should succeed');

    const files2 = getFilesList(TEST_OUTPUT_DIR);
    assert(JSON.stringify(files1) === JSON.stringify(files2), 'File lists should be identical');
  });

  // Test 2: Toggle collection off then on restores same state
  await test("Toggle collection off then on restores same state", async () => {
    // Create initial config and enable collection
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    setTestOutputDir(TEST_CONFIG);
    await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);

    // First apply
    await runCommand(`node awesome-copilot.js apply ${TEST_CONFIG}`);
    const files1 = getFilesList(TEST_OUTPUT_DIR);

    // Toggle collection off
    await runCommand(`node awesome-copilot.js toggle collections testing-automation off --config ${TEST_CONFIG}`);

    // Apply (should remove files)
    fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    await runCommand(`node awesome-copilot.js apply ${TEST_CONFIG}`);
    const files2 = getFilesList(TEST_OUTPUT_DIR);
    assert(files2.length === 0, 'Should have no files when collection disabled');

    // Toggle collection back on
    await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);

    // Apply again
    fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    await runCommand(`node awesome-copilot.js apply ${TEST_CONFIG}`);
    const files3 = getFilesList(TEST_OUTPUT_DIR);

    assert(JSON.stringify(files1) === JSON.stringify(files3), 'File lists should be restored');
  });

  // Test 3: Explicit overrides are maintained across collection toggles
  await test("Explicit overrides are maintained across collection toggles", async () => {
    // Create initial config and enable collection
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    setTestOutputDir(TEST_CONFIG);
    await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);

    // Add explicit override
    await runCommand(`node awesome-copilot.js toggle prompts playwright-generate-test off --config ${TEST_CONFIG}`);

    // Apply and count files
    await runCommand(`node awesome-copilot.js apply ${TEST_CONFIG}`);
    const files1 = getFilesList(TEST_OUTPUT_DIR);

    // Toggle collection off and on
    await runCommand(`node awesome-copilot.js toggle collections testing-automation off --config ${TEST_CONFIG}`);
    await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);

    // Apply again
    fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    await runCommand(`node awesome-copilot.js apply ${TEST_CONFIG}`);
    const files2 = getFilesList(TEST_OUTPUT_DIR);

    assert(JSON.stringify(files1) === JSON.stringify(files2), 'Explicit overrides should be maintained');

    // Verify playwright-generate-test is still not present
    const hasPlaywrightTest = files2.some(f => f.includes('playwright-generate-test'));
    assert(!hasPlaywrightTest, 'Explicitly disabled item should stay disabled');
  });

  // Test 4: Multiple apply operations are truly idempotent
  await test("Multiple apply operations are truly idempotent", async () => {
    // Setup
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    setTestOutputDir(TEST_CONFIG);
    await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);
    await runCommand(`node awesome-copilot.js toggle prompts create-readme on --config ${TEST_CONFIG}`);

    // Apply multiple times
    for (let i = 0; i < 3; i++) {
      await runCommand(`node awesome-copilot.js apply ${TEST_CONFIG}`);
    }

    const files1 = getFilesList(TEST_OUTPUT_DIR);

    // Apply once more
    await runCommand(`node awesome-copilot.js apply ${TEST_CONFIG}`);
    const files2 = getFilesList(TEST_OUTPUT_DIR);

    assert(JSON.stringify(files1) === JSON.stringify(files2), 'Multiple applies should be idempotent');
  });

  console.log(`\nIntegration Test Results: ${passedTests}/${totalTests} passed`);

  cleanup(); // Final cleanup

  if (passedTests === totalTests) {
    console.log('🎉 All integration tests passed!');
    return true;
  } else {
    console.log('💥 Some integration tests failed!');
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
