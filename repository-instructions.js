#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseConfigYamlContent } = require("./apply-config");
const { computeEffectiveItemStates } = require("./config-manager");

/**
 * Generate or update .github/copilot-instructions.md based on enabled instructions
 */
async function generateRepositoryInstructions(configPath = "awesome-copilot.config.yml", options = {}) {
  const { 
    outputFile = ".github/copilot-instructions.md",
    template = "repository",
    includeHeader = true,
    rootDir = __dirname
  } = options;

  console.log("🤖 Generating GitHub Copilot repository instructions...");

  // Load configuration
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }

  const rawContent = fs.readFileSync(configPath, "utf8");
  const config = parseConfigYamlContent(rawContent) || {};
  
  // Compute effective states to determine which instructions are enabled
  const effectiveStates = computeEffectiveItemStates(config);
  
  // Get enabled instructions
  const enabledInstructions = [];
  for (const [instructionName, state] of Object.entries(effectiveStates.instructions)) {
    if (state.enabled) {
      const instructionPath = path.join(rootDir, "instructions", `${instructionName}.instructions.md`);
      if (fs.existsSync(instructionPath)) {
        enabledInstructions.push({
          name: instructionName,
          path: instructionPath,
          reason: state.reason
        });
      }
    }
  }

  console.log(`📋 Found ${enabledInstructions.length} enabled instructions`);

  // Generate the repository instructions content
  const content = await generateInstructionsContent(enabledInstructions, template, includeHeader);

  // Ensure output directory exists
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created directory: ${outputDir}`);
  }

  // Write the file
  fs.writeFileSync(outputFile, content);
  console.log(`✅ Generated repository instructions: ${outputFile}`);

  return {
    file: outputFile,
    instructionsCount: enabledInstructions.length,
    instructions: enabledInstructions.map(i => i.name)
  };
}

/**
 * Generate the content for the repository instructions file
 */
async function generateInstructionsContent(enabledInstructions, template, includeHeader) {
  let content = "";

  if (includeHeader) {
    content += generateHeader();
  }

  if (enabledInstructions.length === 0) {
    content += generateEmptyInstructions();
    return content;
  }

  // Add instructions based on template
  if (template === "repository") {
    content += generateRepositoryTemplate(enabledInstructions);
  } else if (template === "consolidated") {
    content += await generateConsolidatedTemplate(enabledInstructions);
  } else {
    content += await generateBasicTemplate(enabledInstructions);
  }

  return content;
}

/**
 * Generate header for the repository instructions
 */
function generateHeader() {
  return `# GitHub Copilot Repository Instructions

This file contains custom instructions for GitHub Copilot when working in this repository.
These instructions are automatically generated from the enabled instruction files in the awesome-copilot configuration.

## How This Works

GitHub Copilot will automatically use these instructions when:
- You're working in this repository
- Copilot is generating code, explanations, or suggestions
- You're using Copilot Chat within this repository context

## Instructions Source

These instructions are compiled from the following sources:
- Enabled instruction files from the awesome-copilot configuration
- Repository-specific coding standards and best practices
- Technology-specific guidelines relevant to this project

---

`;
}

/**
 * Generate content when no instructions are enabled
 */
function generateEmptyInstructions() {
  return `## No Instructions Enabled

Currently, no instruction files are enabled in the awesome-copilot configuration.

To add instructions:
1. Edit your \`awesome-copilot.config.yml\` file
2. Enable the desired instruction files
3. Run \`awesome-copilot generate-repo-instructions\` to update this file

Available instructions can be found in the \`instructions/\` directory.
`;
}

/**
 * Generate repository-style template with references to instruction files
 */
function generateRepositoryTemplate(enabledInstructions) {
  let content = `## Active Instructions

The following ${enabledInstructions.length} instruction set${enabledInstructions.length !== 1 ? 's are' : ' is'} currently active for this repository:

`;

  // Group instructions by reason
  const groupedByReason = {};
  enabledInstructions.forEach(instruction => {
    const reason = instruction.reason || 'explicit';
    if (!groupedByReason[reason]) {
      groupedByReason[reason] = [];
    }
    groupedByReason[reason].push(instruction);
  });

  // Add instructions grouped by reason
  for (const [reason, instructions] of Object.entries(groupedByReason)) {
    content += `### ${reason === 'explicit' ? 'Explicitly Enabled' : 
                        reason === 'collection' ? 'Enabled via Collections' : 
                        reason.charAt(0).toUpperCase() + reason.slice(1)}\n\n`;
    
    instructions.forEach(instruction => {
      const title = extractTitleFromInstruction(instruction.path) || instruction.name;
      content += `- **${title}** (\`${instruction.name}\`)\n`;
    });
    content += '\n';
  }

  content += `## Instruction Details

For detailed information about each instruction set, refer to the individual instruction files in the \`instructions/\` directory.

`;

  return content;
}

/**
 * Generate consolidated template with full instruction content
 */
async function generateConsolidatedTemplate(enabledInstructions) {
  let content = `## Consolidated Instructions

The following instructions combine all enabled instruction sets:

`;

  for (const instruction of enabledInstructions) {
    const title = extractTitleFromInstruction(instruction.path) || instruction.name;
    const instructionContent = fs.readFileSync(instruction.path, 'utf8');
    
    // Extract the main content (skip frontmatter)
    const cleanContent = extractInstructionContent(instructionContent);
    
    content += `### ${title}

${cleanContent}

---

`;
  }

  return content;
}

/**
 * Generate basic template with simple list
 */
async function generateBasicTemplate(enabledInstructions) {
  let content = `## Enabled Instructions

`;

  enabledInstructions.forEach(instruction => {
    const title = extractTitleFromInstruction(instruction.path) || instruction.name;
    content += `- ${title}\n`;
  });

  content += `\nFor detailed instruction content, see the individual files in the \`instructions/\` directory.

`;

  return content;
}

/**
 * Extract title from instruction file
 */
function extractTitleFromInstruction(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Look for title in frontmatter first
    let inFrontmatter = false;
    for (const line of lines) {
      if (line.trim() === '---') {
        inFrontmatter = !inFrontmatter;
        continue;
      }
      
      if (inFrontmatter && line.includes('title:')) {
        const title = line.substring(line.indexOf('title:') + 6).trim();
        return title.replace(/^['"]|['"]$/g, '');
      }
    }
    
    // Look for first heading
    for (const line of lines) {
      if (line.startsWith('# ')) {
        return line.substring(2).trim();
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Extract main content from instruction file (skip frontmatter)
 */
function extractInstructionContent(content) {
  const lines = content.split('\n');
  let inFrontmatter = false;
  let frontmatterEnded = false;
  const contentLines = [];
  
  for (const line of lines) {
    if (line.trim() === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true;
        continue;
      } else if (inFrontmatter && !frontmatterEnded) {
        frontmatterEnded = true;
        continue;
      }
    }
    
    if (!inFrontmatter || frontmatterEnded) {
      contentLines.push(line);
    }
  }
  
  return contentLines.join('\n').trim();
}

/**
 * CLI handler for generate-repo-instructions command
 */
async function handleGenerateRepoInstructions(args) {
  const configFile = args.find(arg => !arg.startsWith('--')) || "awesome-copilot.config.yml";
  
  // Parse flags
  const template = args.includes('--consolidated') ? 'consolidated' : 
                  args.includes('--basic') ? 'basic' : 'repository';
  const outputFile = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 
                    ".github/copilot-instructions.md";
  const noHeader = args.includes('--no-header');

  try {
    const result = await generateRepositoryInstructions(configFile, {
      outputFile,
      template,
      includeHeader: !noHeader
    });

    console.log(`\n📋 Repository instructions generated successfully!`);
    console.log(`📁 File: ${result.file}`);
    console.log(`📊 Instructions: ${result.instructionsCount}`);
    
    if (result.instructions.length > 0) {
      console.log(`📝 Included: ${result.instructions.join(', ')}`);
    }

    console.log(`\n💡 Next steps:`);
    console.log(`   • Commit the generated file to enable repository-wide Copilot instructions`);
    console.log(`   • GitHub Copilot will automatically use these instructions in this repository`);
    console.log(`   • Update instructions by modifying your config and re-running this command`);

  } catch (error) {
    console.error(`❌ Error generating repository instructions: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  generateRepositoryInstructions,
  handleGenerateRepoInstructions
};

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  handleGenerateRepoInstructions(args);
}