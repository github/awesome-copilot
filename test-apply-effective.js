#!/usr/bin/env node

/**
 * Test to verify that apply operations always use effective states
 */

const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);

// Change to project directory for tests
process.chdir(__dirname);

const TEST_CONFIG = 'test-apply-effective.yml';
const TEST_OUTPUT_DIR = '.test-apply-effective';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function cleanup() {
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
        files.push(path.basename(fullPath));
      }
    }
  }
  traverse(dir);
  return files.sort();
}

function setTestOutputDir(configFile) {
  let configContent = fs.readFileSync(configFile, 'utf8');
  configContent = configContent.replace('output_directory: ".awesome-copilot"', `output_directory: "${TEST_OUTPUT_DIR}"`);
  fs.writeFileSync(configFile, configContent);
}

async function runTests() {
  console.log('Testing that apply operations use effective states...\n');
  
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

  // Test 1: Apply respects explicit false overrides
  await test("Apply respects explicit false overrides", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    setTestOutputDir(TEST_CONFIG);
    
    // Enable collection
    await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);
    
    // Explicitly disable one item from the collection
    await runCommand(`node awesome-copilot.js toggle prompts playwright-generate-test off --config ${TEST_CONFIG}`);
    
    // Apply
    await runCommand(`node awesome-copilot.js apply ${TEST_CONFIG}`);
    
    const files = getFilesList(TEST_OUTPUT_DIR);
    
    // Should have files from collection but NOT the explicitly disabled one
    assert(files.includes('csharp-nunit.prompt.md'), 'Should include collection items');
    assert(!files.includes('playwright-generate-test.prompt.md'), 'Should NOT include explicitly disabled items');
  });

  // Test 2: Apply includes collection items that are undefined
  await test("Apply includes collection items that are undefined", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    setTestOutputDir(TEST_CONFIG);
    
    // Enable collection (items remain undefined - no explicit settings)
    await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);
    
    // Apply
    await runCommand(`node awesome-copilot.js apply ${TEST_CONFIG}`);
    
    const files = getFilesList(TEST_OUTPUT_DIR);
    
    // Should include all collection items since none are explicitly overridden
    assert(files.includes('playwright-generate-test.prompt.md'), 'Should include undefined collection items');
    assert(files.includes('csharp-nunit.prompt.md'), 'Should include all collection items');
    assert(files.includes('tdd-red.chatmode.md'), 'Should include collection chatmodes');
  });

  // Test 3: Apply respects explicit true overrides over disabled collections
  await test("Apply respects explicit true overrides over disabled collections", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    setTestOutputDir(TEST_CONFIG);
    
    // Collection remains disabled, but explicitly enable one item
    await runCommand(`node awesome-copilot.js toggle prompts playwright-generate-test on --config ${TEST_CONFIG}`);
    
    // Apply
    await runCommand(`node awesome-copilot.js apply ${TEST_CONFIG}`);
    
    const files = getFilesList(TEST_OUTPUT_DIR);
    
    // Should only have the explicitly enabled item
    assert(files.includes('playwright-generate-test.prompt.md'), 'Should include explicitly enabled items');
    assert(!files.includes('csharp-nunit.prompt.md'), 'Should NOT include collection items when collection disabled');
    assert(files.length === 1, 'Should only have one file');
  });

  // Test 4: Multiple collections work together through effective states
  await test("Multiple collections work together through effective states", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    setTestOutputDir(TEST_CONFIG);
    
    // Enable multiple collections
    await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);
    await runCommand(`node awesome-copilot.js toggle collections frontend-web-dev on --config ${TEST_CONFIG}`);
    
    // Apply
    await runCommand(`node awesome-copilot.js apply ${TEST_CONFIG}`);
    
    const files = getFilesList(TEST_OUTPUT_DIR);
    
    // Should have items from both collections
    assert(files.length > 11, 'Should have items from multiple collections'); // testing-automation has 11 items
    assert(files.includes('playwright-generate-test.prompt.md'), 'Should include testing items');
  });

  // Test 5: Apply output matches effective state computation
  await test("Apply output matches effective state computation", async () => {
    await runCommand(`node awesome-copilot.js init ${TEST_CONFIG}`);
    setTestOutputDir(TEST_CONFIG);
    
    // Complex scenario: collection + explicit override + individual enable
    await runCommand(`node awesome-copilot.js toggle collections testing-automation on --config ${TEST_CONFIG}`);
    await runCommand(`node awesome-copilot.js toggle prompts playwright-generate-test off --config ${TEST_CONFIG}`);
    await runCommand(`node awesome-copilot.js toggle prompts create-readme on --config ${TEST_CONFIG}`);
    
    // Get list of what should be enabled according to CLI (only individual items, not collections)
    const listResult = await runCommand(`node awesome-copilot.js list prompts --config ${TEST_CONFIG}`);
    const enabledPrompts = (listResult.stdout.match(/\[✓\] (\S+)/g) || []).map(m => m.replace('[✓] ', '').split(' ')[0]);
    
    const instructionsResult = await runCommand(`node awesome-copilot.js list instructions --config ${TEST_CONFIG}`);
    const enabledInstructions = (instructionsResult.stdout.match(/\[✓\] (\S+)/g) || []).map(m => m.replace('[✓] ', '').split(' ')[0]);
    
    const chatmodesResult = await runCommand(`node awesome-copilot.js list chatmodes --config ${TEST_CONFIG}`);
    const enabledChatmodes = (chatmodesResult.stdout.match(/\[✓\] (\S+)/g) || []).map(m => m.replace('[✓] ', '').split(' ')[0]);
    
    const allEnabledItems = [...enabledPrompts, ...enabledInstructions, ...enabledChatmodes];
    
    // Apply and get actual files
    await runCommand(`node awesome-copilot.js apply ${TEST_CONFIG}`);
    const actualFiles = getFilesList(TEST_OUTPUT_DIR);
    
    // Extract base names for comparison
    const actualBaseNames = actualFiles.map(f => f.replace(/\.(prompt|instructions|chatmode)\.md$/, ''));
    
    // Every enabled item in list should have a corresponding file
    allEnabledItems.forEach(item => {
      assert(actualBaseNames.includes(item), `Item ${item} shown as enabled should have corresponding file`);
    });
    
    // Every file should correspond to an enabled item
    actualBaseNames.forEach(fileName => {
      assert(allEnabledItems.includes(fileName), `File ${fileName} should correspond to an enabled item`);
    });
  });

  console.log(`\nEffective States Apply Test Results: ${passedTests}/${totalTests} passed`);
  
  cleanup(); // Final cleanup
  
  if (passedTests === totalTests) {
    console.log('🎉 All effective states apply tests passed!');
    return true;
  } else {
    console.log('💥 Some effective states apply tests failed!');
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