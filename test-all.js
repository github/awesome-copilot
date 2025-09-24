#!/usr/bin/env node

/**
 * Comprehensive test suite for all awesome-copilot functionality
 */

const { runTests: runUnitTests } = require('./test-effective-states');
const { runTests: runIntegrationTests } = require('./test-integration');
const { runTests: runCliTests } = require('./test-cli');
const { runTests: runApplyTests } = require('./test-apply-effective');
const { runTests: runToggleCollectionTests } = require('./test-toggle-collection');

async function runAllTests() {
  console.log('🧪 Running Awesome Copilot Comprehensive Test Suite\n');
  console.log('='.repeat(60));
  
  const results = {
    unit: false,
    integration: false,
    cli: false,
    apply: false,
    toggleCollection: false
  };

  try {
    console.log('\n📊 Unit Tests (Effective State Computation)');
    console.log('-'.repeat(45));
    results.unit = await runUnitTests();
  } catch (error) {
    console.error('Unit tests failed with error:', error.message);
  }

  try {
    console.log('\n🔄 Integration Tests (Toggle+Apply Idempotency)');
    console.log('-'.repeat(48));
    results.integration = await runIntegrationTests();
  } catch (error) {
    console.error('Integration tests failed with error:', error.message);
  }

  try {
    console.log('\n⌨️  CLI Tests (List and Toggle Commands)');
    console.log('-'.repeat(40));
    results.cli = await runCliTests();
  } catch (error) {
    console.error('CLI tests failed with error:', error.message);
  }

  try {
    console.log('\n🎯 Apply Tests (Effective States in Apply)');
    console.log('-'.repeat(42));
    results.apply = await runApplyTests();
  } catch (error) {
    console.error('Apply tests failed with error:', error.message);
  }

  try {
    console.log('\n🔧 Toggle Collection Tests (TASK-003)');
    console.log('-'.repeat(36));
    results.toggleCollection = await runToggleCollectionTests();
  } catch (error) {
    console.error('Toggle collection tests failed with error:', error.message);
  }

  try {
    console.log('\n🤖 Repository Instructions Tests');
    console.log('-'.repeat(33));
    const { runTests: runRepoInstructionsTests } = require('./test-repository-instructions');
    results.repoInstructions = await runRepoInstructionsTests();
  } catch (error) {
    console.error('Repository instructions tests failed with error:', error.message);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 Test Suite Summary');
  console.log('='.repeat(60));
  
  const testTypes = [
    { name: 'Unit Tests', result: results.unit, emoji: '📊' },
    { name: 'Integration Tests', result: results.integration, emoji: '🔄' },
    { name: 'CLI Tests', result: results.cli, emoji: '⌨️' },
    { name: 'Apply Tests', result: results.apply, emoji: '🎯' },
    { name: 'Toggle Collection', result: results.toggleCollection, emoji: '🔧' },
    { name: 'Repo Instructions', result: results.repoInstructions, emoji: '🤖' }
  ];

  testTypes.forEach(test => {
    const status = test.result ? '✅ PASS' : '❌ FAIL';
    console.log(`${test.emoji} ${test.name.padEnd(20)} ${status}`);
  });

  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;

  console.log('\n' + '-'.repeat(60));
  console.log(`Overall Result: ${passedCount}/${totalCount} test suites passed`);
  
  if (passedCount === totalCount) {
    console.log('🎉 All test suites passed! Implementation is complete.');
    console.log('\n✨ Features implemented:');
    console.log('  • Effective state precedence (explicit > collection > disabled)');
    console.log('  • Non-destructive collection toggles with delta summaries');
    console.log('  • Enhanced CLI with reason display (explicit/collection)');
    console.log('  • Performance improvements with Set-based lookups');
    console.log('  • Comprehensive configuration handling');
    console.log('  • Stable config hashing and idempotent operations');
    return true;
  } else {
    console.log('💥 Some test suites failed. Check individual test output above.');
    return false;
  }
}

if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test suite runner error:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests };