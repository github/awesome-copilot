#!/usr/bin/env node

/**
 * Simple test script to validate enhanced awesome-copilot functionality
 * This script tests the key features implemented in the enhancement
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TEST_CONFIG = 'test-functionality.yml';
const TEST_OUTPUT_DIR = '.test-output';

console.log('🧪 Testing enhanced awesome-copilot functionality...\n');

// Cleanup function
function cleanup() {
  if (fs.existsSync(TEST_CONFIG)) {
    fs.unlinkSync(TEST_CONFIG);
  }
  if (fs.existsSync(TEST_OUTPUT_DIR)) {
    execSync(`rm -rf ${TEST_OUTPUT_DIR}`);
  }
  if (fs.existsSync('.awesome-copilot')) {
    execSync(`rm -rf .awesome-copilot`);
  }
}

function runCommand(cmd, description) {
  console.log(`📋 ${description}`);
  try {
    const output = execSync(cmd, { encoding: 'utf8', cwd: __dirname });
    console.log(`✅ Success: ${description}`);
    return output;
  } catch (error) {
    console.log(`❌ Failed: ${description}`);
    console.log(`   Error: ${error.message}`);
    throw error;
  }
}

function checkFileExists(filePath, shouldExist = true) {
  const exists = fs.existsSync(filePath);
  if (shouldExist && exists) {
    console.log(`✅ File exists: ${filePath}`);
    return true;
  } else if (!shouldExist && !exists) {
    console.log(`✅ File correctly removed: ${filePath}`);
    return true;
  } else {
    console.log(`❌ File ${exists ? 'exists' : 'missing'}: ${filePath} (expected ${shouldExist ? 'to exist' : 'to be removed'})`);
    return false;
  }
}

try {
  // Test 1: Initialize a test configuration
  console.log('\n🔧 Test 1: Initialize test configuration');
  runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`, 'Initialize test config');
  
  // Test 2: Validate configuration file was created
  console.log('\n🔧 Test 2: Validate configuration file');
  if (!checkFileExists(TEST_CONFIG)) {
    throw new Error('Configuration file was not created');
  }

  // Test 3: Test enhanced list command (should show collections first)
  console.log('\n🔧 Test 3: Test enhanced list command');
  const listOutput = runCommand(`node awesome-copilot.js list --config ${TEST_CONFIG}`, 'List all items with enhanced display');
  
  if (!listOutput.includes('Collections (')) {
    throw new Error('Enhanced list should show Collections section first');
  }
  
  if (!listOutput.includes('📦 indicates items that are part of collections')) {
    throw new Error('Enhanced list should show collection indicators help text');
  }

  // Test 4: Test collection toggle with cascading
  console.log('\n🔧 Test 4: Test collection toggle with cascading');
  const toggleOutput = runCommand(`node awesome-copilot.js toggle collections project-planning on --config ${TEST_CONFIG}`, 'Enable collection with cascading');
  
  if (!toggleOutput.includes('individual items from collection')) {
    throw new Error('Collection toggle should report cascading to individual items');
  }
  
  if (!toggleOutput.includes('Applying configuration automatically')) {
    throw new Error('Collection toggle should auto-apply configuration');
  }

  // Test 5: Test individual item override
  console.log('\n🔧 Test 5: Test individual item override');
  runCommand(`node awesome-copilot.js toggle prompts breakdown-epic-arch off --config ${TEST_CONFIG}`, 'Disable individual item in collection');
  
  // Check that the file was removed
  const promptPath = path.join('.awesome-copilot', 'prompts', 'breakdown-epic-arch.prompt.md');
  if (!checkFileExists(promptPath, false)) {
    throw new Error('Individual item override did not remove file');
  }

  // Test 6: Test idempotency (running apply twice should skip files)
  console.log('\n🔧 Test 6: Test idempotency');
  const applyOutput1 = runCommand(`node awesome-copilot.js apply ${TEST_CONFIG}`, 'First apply run');
  const applyOutput2 = runCommand(`node awesome-copilot.js apply ${TEST_CONFIG}`, 'Second apply run (should be idempotent)');
  
  if (!applyOutput2.includes('Skipped (up to date)')) {
    throw new Error('Second apply should skip files that are up to date');
  }

  // Test 7: Test config validation with invalid config
  console.log('\n🔧 Test 7: Test config validation');
  const invalidConfig = `
version: 1.0
prompts:
  test-prompt: invalid_boolean_value
unknown_section:
  test: true
`;
  
  fs.writeFileSync('test-invalid-config.yml', invalidConfig);
  
  try {
    execSync(`node awesome-copilot.js apply test-invalid-config.yml`, { encoding: 'utf8' });
    throw new Error('Invalid config should have been rejected');
  } catch (error) {
    if (error.stderr && error.stderr.includes('Configuration validation errors')) {
      console.log('✅ Config validation correctly rejected invalid configuration');
    } else if (error.message && error.message.includes('Configuration validation failed')) {
      console.log('✅ Config validation correctly rejected invalid configuration');
    } else {
      throw new Error('Config validation did not provide proper error message');
    }
  } finally {
    if (fs.existsSync('test-invalid-config.yml')) {
      fs.unlinkSync('test-invalid-config.yml');
    }
  }

  // Test 8: Check that state file is created for idempotency
  console.log('\n🔧 Test 8: Check state file creation');
  const stateFilePath = path.join('.awesome-copilot', '.awesome-copilot-state.json');
  if (!checkFileExists(stateFilePath)) {
    throw new Error('State file should be created for idempotency tracking');
  }

  console.log('\n🎉 All tests passed! Enhanced functionality is working correctly.');
  console.log('\n✨ Features validated:');
  console.log('   • Collection toggle with item cascading');
  console.log('   • Enhanced list display with collection indicators');
  console.log('   • Auto-apply after toggle operations');
  console.log('   • File removal when items are disabled');
  console.log('   • Individual item overrides');
  console.log('   • Idempotent apply operations');
  console.log('   • Configuration validation with error reporting');
  console.log('   • State tracking for optimization');

} catch (error) {
  console.log(`\n💥 Test failed: ${error.message}`);
  process.exit(1);
} finally {
  // Cleanup
  cleanup();
  console.log('\n🧹 Cleanup completed.');
}