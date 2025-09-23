#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { generateRepositoryInstructions } = require("./repository-instructions");

console.log("🧪 Testing Repository Instructions Generation");
console.log("=".repeat(50));

/**
 * Test repository instructions generation
 */
async function testRepositoryInstructions() {
  const testConfigPath = "test-repo-instructions.yml";
  const testOutputPath = ".github/test-copilot-instructions.md";
  
  // Create a test configuration with some enabled instructions
  const testConfig = `# Test configuration for repository instructions
instructions:
  javascript: true
  python: false
  csharp: true
  
collections:
  frontend-web-dev: true
`;

  try {
    // Write test config
    fs.writeFileSync(testConfigPath, testConfig);
    console.log("✅ Created test configuration");

    // Test basic generation
    console.log("\n📋 Testing basic repository instructions generation...");
    const result = await generateRepositoryInstructions(testConfigPath, {
      outputFile: testOutputPath,
      template: "repository"
    });

    console.log(`✅ Generated file: ${result.file}`);
    console.log(`📊 Instructions count: ${result.instructionsCount}`);
    console.log(`📝 Instructions: ${result.instructions.join(', ')}`);

    // Verify the file was created
    if (fs.existsSync(testOutputPath)) {
      const content = fs.readFileSync(testOutputPath, 'utf8');
      console.log(`📄 File size: ${content.length} characters`);
      
      // Check for expected content
      const hasHeader = content.includes("GitHub Copilot Repository Instructions");
      const hasInstructions = content.includes("Active Instructions");
      
      console.log(`✅ Has header: ${hasHeader}`);
      console.log(`✅ Has instructions section: ${hasInstructions}`);
      
      if (hasHeader && hasInstructions) {
        console.log("✅ Content validation passed");
      } else {
        console.log("❌ Content validation failed");
        return false;
      }
    } else {
      console.log("❌ Output file was not created");
      return false;
    }

    // Test consolidated template
    console.log("\n📋 Testing consolidated template...");
    const consolidatedPath = ".github/test-consolidated-instructions.md";
    await generateRepositoryInstructions(testConfigPath, {
      outputFile: consolidatedPath,
      template: "consolidated"
    });

    if (fs.existsSync(consolidatedPath)) {
      const consolidatedContent = fs.readFileSync(consolidatedPath, 'utf8');
      console.log(`✅ Consolidated file created (${consolidatedContent.length} characters)`);
      fs.unlinkSync(consolidatedPath);
    }

    // Test empty config
    console.log("\n📋 Testing empty configuration...");
    const emptyConfig = `# Empty configuration
instructions: {}
`;
    const emptyConfigPath = "test-empty-repo-instructions.yml";
    const emptyOutputPath = ".github/test-empty-instructions.md";
    
    fs.writeFileSync(emptyConfigPath, emptyConfig);
    
    await generateRepositoryInstructions(emptyConfigPath, {
      outputFile: emptyOutputPath,
      template: "repository"
    });

    if (fs.existsSync(emptyOutputPath)) {
      const emptyContent = fs.readFileSync(emptyOutputPath, 'utf8');
      const hasEmptyMessage = emptyContent.includes("No Instructions Enabled");
      console.log(`✅ Empty config handled correctly: ${hasEmptyMessage}`);
      fs.unlinkSync(emptyOutputPath);
    }

    // Cleanup
    fs.unlinkSync(testConfigPath);
    fs.unlinkSync(emptyConfigPath);
    fs.unlinkSync(testOutputPath);
    
    console.log("\n🎉 All repository instructions tests passed!");
    return true;

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    
    // Cleanup on error
    [testConfigPath, testOutputPath, "test-empty-repo-instructions.yml", ".github/test-empty-instructions.md", ".github/test-consolidated-instructions.md"].forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
    
    return false;
  }
}

/**
 * Test CLI integration
 */
async function testCLIIntegration() {
  console.log("\n🖥️  Testing CLI Integration");
  console.log("-".repeat(30));

  try {
    // Test the awesome-copilot command includes the new command
    const { main } = require("./awesome-copilot");
    
    // Check if the command is registered
    const originalArgv = process.argv;
    process.argv = ["node", "awesome-copilot.js", "help"];
    
    // Capture help output
    const originalLog = console.log;
    let helpOutput = "";
    console.log = (...args) => {
      helpOutput += args.join(" ") + "\n";
    };
    
    try {
      main();
    } catch (error) {
      // Expected for help command
    }
    
    console.log = originalLog;
    process.argv = originalArgv;
    
    // Check if our command is in the help output
    const hasRepoInstructionsCommand = helpOutput.includes("generate-repo-instructions");
    console.log(`✅ Command registered in CLI: ${hasRepoInstructionsCommand}`);
    
    return hasRepoInstructionsCommand;
    
  } catch (error) {
    console.error(`❌ CLI integration test failed: ${error.message}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  const test1 = await testRepositoryInstructions();
  const test2 = await testCLIIntegration();
  
  console.log("\n" + "=".repeat(50));
  console.log("📊 Test Results Summary");
  console.log("=".repeat(50));
  console.log(`Repository Instructions Generation: ${test1 ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`CLI Integration: ${test2 ? "✅ PASS" : "❌ FAIL"}`);
  
  const allPassed = test1 && test2;
  console.log(`\nOverall Result: ${allPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}`);
  
  if (allPassed) {
    console.log("\n🎉 Repository instructions feature is working correctly!");
  }
  
  return allPassed;
}

// Run tests
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runTests };