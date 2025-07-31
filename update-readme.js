#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Template sections for the README
const TEMPLATES = {
  header: `# 🤖 Awesome GitHub Copilot Customizations

Enhance your GitHub Copilot experience with community-contributed instructions, prompts, and configurations. Get consistent AI assistance that follows your team's coding standards and project requirements.

## 🎯 GitHub Copilot Customization Features

GitHub Copilot provides four main ways to customize AI responses and tailor assistance to your specific workflows, team guidelines, and project requirements:

| **📋 [Custom Instructions](#-custom-instructions)** | **🎯 [Reusable Prompts](#-reusable-prompts)** | **🧩 [Custom Chat Modes](#-custom-chat-modes)** | **📁 [Collections](#-collections)** |
| --- | --- | --- | --- |
| Define common guidelines for tasks like code generation, reviews, and commit messages. Describe *how* tasks should be performed<br><br>**Benefits:**<br>• Automatic inclusion in every chat request<br>• Repository-wide consistency<br>• Multiple implementation options | Create reusable, standalone prompts for specific tasks. Describe *what* should be done with optional task-specific guidelines<br><br>**Benefits:**<br>• Eliminate repetitive prompt writing<br>• Shareable across teams<br>• Support for variables and dependencies | Define chat behavior, available tools, and codebase interaction patterns within specific boundaries for each request<br><br>**Benefits:**<br>• Context-aware assistance<br>• Tool configuration<br>• Role-specific workflows | Curated bundles of domain-specific instructions, prompts, and chat modes organized by technology or workflow<br><br>**Benefits:**<br>• Complete solution packages<br>• Domain-specific expertise<br>• Pre-configured workflows |

> **💡 Pro Tip:** Custom instructions only affect Copilot Chat (not inline code completions). You can combine all four customization types - use custom instructions for general guidelines, prompt files for specific tasks, chat modes to control interaction context, and collections for domain-specific workflows.


## 📝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on how to submit new instructions and prompts.`,

  collectionsSection: `## 📁 Collections

Curated collections of prompts, instructions, and chat modes organized by specific domains or workflows:`,

  collectionsUsage: `> 💡 **Usage**: Each collection contains domain-specific customizations. Navigate to a collection folder to find its specialized prompts, instructions, and chat modes.`,

  collectionHeader: (collectionName) => `# 🎯 ${collectionName.charAt(0).toUpperCase() + collectionName.slice(1)} Collection

A curated collection of GitHub Copilot customizations focused on ${collectionName} workflows and best practices.

## 📄 About This Collection

This collection provides specialized prompts, instructions, and chat modes tailored for ${collectionName}-related development tasks.`,

  instructionsSection: `## 📋 Custom Instructions

Team and project-specific instructions to enhance GitHub Copilot's behavior for specific technologies and coding practices:`,

  instructionsUsage: `> 💡 **Usage**: Copy these instructions to your \`.github/copilot-instructions.md\` file or create task-specific \`.github/.instructions.md\` files in your workspace's \`.github/instructions\` folder.`,

  promptsSection: `## 🎯 Reusable Prompts

Ready-to-use prompt templates for specific development scenarios and tasks, defining prompt text with a specific mode, model, and available set of tools.`,

  promptsUsage: `> 💡 **Usage**: Use \`/prompt-name\` in VS Code chat, run \`Chat: Run Prompt\` command, or hit the run button while you have a prompt open.`,

  chatmodesSection: `## 🧩 Custom Chat Modes

Custom chat modes define specific behaviors and tools for GitHub Copilot Chat, enabling enhanced context-aware assistance for particular tasks or workflows.`,

  chatmodesUsage: `> 💡 **Usage**: Create new chat modes using the command \`Chat: Configure Chat Modes...\`, then switch your chat mode in the Chat input from _Agent_ or _Ask_ to your own mode.`,

  footer: `## 📚 Additional Resources

- [VS Code Copilot Customization Documentation](https://code.visualstudio.com/docs/copilot/copilot-customization) - Official Microsoft documentation
- [GitHub Copilot Chat Documentation](https://code.visualstudio.com/docs/copilot/chat/copilot-chat) - Complete chat feature guide
- [Custom Chat Modes](https://code.visualstudio.com/docs/copilot/chat/chat-modes) - Advanced chat configuration
- [VS Code Settings](https://code.visualstudio.com/docs/getstarted/settings) - General VS Code configuration guide

## 🛠️ Development Configuration

This repository uses various configuration files to ensure consistent code style and avoid issues with line endings:

- [\`.editorconfig\`](.editorconfig) - Defines coding styles across different editors and IDEs
- [\`.gitattributes\`](.gitattributes) - Ensures consistent line endings in text files
- [\`.vscode/settings.json\`](.vscode/settings.json) - VS Code-specific settings for this repository
- [\`.vscode/extensions.json\`](.vscode/extensions.json) - Recommended VS Code extensions

> 💡 **Note**: All markdown files in this repository use LF line endings (Unix-style) to avoid mixed line endings issues. The repository is configured to automatically handle line endings conversion.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## ™️ Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.`,
};

// Add error handling utility
function safeFileOperation(operation, filePath, defaultValue = null) {
  try {
    return operation();
  } catch (error) {
    console.error(`Error processing file ${filePath}: ${error.message}`);
    return defaultValue;
  }
}

/**
 * Get all collections in the collections directory
 */
function getCollections(collectionsDir) {
  if (!fs.existsSync(collectionsDir)) {
    return [];
  }

  return fs.readdirSync(collectionsDir)
    .filter(item => {
      const itemPath = path.join(collectionsDir, item);
      return fs.statSync(itemPath).isDirectory();
    })
    .sort();
}

/**
 * Extract description from a collection's README or create default
 */
function getCollectionDescription(collectionPath) {
  const readmePath = path.join(collectionPath, 'README.md');

  if (fs.existsSync(readmePath)) {
    return safeFileOperation(() => {
      const content = fs.readFileSync(readmePath, 'utf8');
      const lines = content.split('\n');

      // Look for description in frontmatter first
      let inFrontmatter = false;
      for (const line of lines) {
        if (line.trim() === '---') {
          if (!inFrontmatter) {
            inFrontmatter = true;
            continue;
          } else {
            break;
          }
        }

        if (inFrontmatter && line.includes('description:')) {
          const match = line.match(/^description:\s*['"]?(.+?)['"]?$/);
          if (match) {
            return match[1];
          }
        }
      }

      // Look for first paragraph after headers
      let foundHeader = false;
      for (const line of lines) {
        if (line.startsWith('#')) {
          foundHeader = true;
          continue;
        }

        if (foundHeader && line.trim() && !line.startsWith('#') && !line.startsWith('>')) {
          return line.trim();
        }
      }

      return null;
    }, readmePath, null);
  }

  return null;
}

function extractTitle(filePath) {
  return safeFileOperation(
    () => {
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");

      // Step 1: Look for title in frontmatter for all file types
      let inFrontmatter = false;
      let frontmatterEnded = false;

      for (const line of lines) {
        if (line.trim() === "---") {
          if (!inFrontmatter) {
            inFrontmatter = true;
          } else if (!frontmatterEnded) {
            frontmatterEnded = true;
          }
          continue;
        }

        if (inFrontmatter && !frontmatterEnded) {
          // Look for title field in frontmatter
          if (line.includes("title:")) {
            // Extract everything after 'title:'
            const afterTitle = line
              .substring(line.indexOf("title:") + 6)
              .trim();
            // Remove quotes if present
            const cleanTitle = afterTitle.replace(/^['"]|['"]$/g, "");
            return cleanTitle;
          }
        }
      }

      // Reset for second pass
      inFrontmatter = false;
      frontmatterEnded = false;

      // Step 2: For prompt/chatmode/instructions files, look for heading after frontmatter
      if (
        filePath.includes(".prompt.md") ||
        filePath.includes(".chatmode.md") ||
        filePath.includes(".instructions.md")
      ) {
        for (const line of lines) {
          if (line.trim() === "---") {
            if (!inFrontmatter) {
              inFrontmatter = true;
            } else if (inFrontmatter && !frontmatterEnded) {
              frontmatterEnded = true;
            }
            continue;
          }

          if (frontmatterEnded && line.startsWith("# ")) {
            return line.substring(2).trim();
          }
        }

        // Step 3: Format filename for prompt/chatmode/instructions files if no heading found
        const basename = path.basename(
          filePath,
          filePath.includes(".prompt.md")
            ? ".prompt.md"
            : filePath.includes(".chatmode.md")
            ? ".chatmode.md"
            : ".instructions.md"
        );
        return basename
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
      }

      // Step 4: For instruction files, look for the first heading
      for (const line of lines) {
        if (line.startsWith("# ")) {
          return line.substring(2).trim();
        }
      }

      // Step 5: Fallback to filename
      const basename = path.basename(filePath, path.extname(filePath));
      return basename
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
    },
    filePath,
    path
      .basename(filePath, path.extname(filePath))
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

function extractDescription(filePath) {
  return safeFileOperation(
    () => {
      const content = fs.readFileSync(filePath, "utf8");

      // Parse frontmatter for description (for both prompts and instructions)
      const lines = content.split("\n");
      let inFrontmatter = false;

      // For multi-line descriptions
      let isMultilineDescription = false;
      let multilineDescription = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.trim() === "---") {
          if (!inFrontmatter) {
            inFrontmatter = true;
            continue;
          }
          break;
        }

        if (inFrontmatter) {
          // Check for multi-line description with pipe syntax (|)
          const multilineMatch = line.match(/^description:\s*\|(\s*)$/);
          if (multilineMatch) {
            isMultilineDescription = true;
            // Continue to next line to start collecting the multi-line content
            continue;
          }

          // If we're collecting a multi-line description
          if (isMultilineDescription) {
            // If the line has no indentation or has another frontmatter key, stop collecting
            if (!line.startsWith("  ") || line.match(/^[a-zA-Z0-9_-]+:/)) {
              // Join the collected lines and return
              return multilineDescription.join(" ").trim();
            }

            // Add the line to our multi-line collection (removing the 2-space indentation)
            multilineDescription.push(line.substring(2));
          } else {
            // Look for single-line description field in frontmatter
            const descriptionMatch = line.match(
              /^description:\s*['"]?(.+?)['"]?$/
            );
            if (descriptionMatch) {
              let description = descriptionMatch[1];

              // Check if the description is wrapped in single quotes and handle escaped quotes
              const singleQuoteMatch = line.match(/^description:\s*'(.+)'$/);
              if (singleQuoteMatch) {
                // Replace escaped single quotes ('') with single quotes (')
                description = singleQuoteMatch[1].replace(/''/g, "'");
              }

              return description;
            }
          }
        }
      }

      // If we've collected multi-line description but the frontmatter ended
      if (multilineDescription.length > 0) {
        return multilineDescription.join(" ").trim();
      }

      return null;
    },
    filePath,
    null
  );
}

/**
 * Generate badges for installation links in VS Code and VS Code Insiders.
 * @param {string} link - The relative link to the instructions or prompts file.
 * @param {string} type - The type of customization (instructions, prompt, chatmode).
 * @param {string} collectionPath - Optional collection path prefix for URLs.
 * @returns {string} - Markdown formatted badges for installation.
 */
const vscodeInstallImage =
  "https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white";
const vscodeInsidersInstallImage =
  "https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white";
const repoBaseUrl =
  "https://raw.githubusercontent.com/github/awesome-copilot/main";
const vscodeBaseUrl = "https://vscode.dev/redirect?url=";
const vscodeInsidersBaseUrl = "https://insiders.vscode.dev/redirect?url=";

function makeBadges(link, type, collectionPath = '') {
  const fullLink = collectionPath ? `${collectionPath}/${link}` : link;
  return `[![Install in VS Code](${vscodeInstallImage})](${vscodeBaseUrl}${encodeURIComponent(
    `vscode:chat-${type}/install?url=${repoBaseUrl}/${fullLink})`
  )} [![Install in VS Code](${vscodeInsidersInstallImage})](${vscodeInsidersBaseUrl}${encodeURIComponent(
    `vscode-insiders:chat-${type}/install?url=${repoBaseUrl}/${fullLink})`
  )}`;
}

/**
 * Generate the instructions section with a table of all instructions
 */
function generateInstructionsSection(instructionsDir, collectionPath = '') {
  // Check if instructions directory exists
  if (!fs.existsSync(instructionsDir)) {
    return '';
  }

  // Get all instruction files
  const instructionFiles = fs
    .readdirSync(instructionsDir)
    .filter((file) => file.endsWith(".md"))
    .sort();

  if (instructionFiles.length === 0) {
    return '';
  }

  console.log(`Found ${instructionFiles.length} instruction files in ${instructionsDir}`);

  // Create table header
  let instructionsContent =
    "| Title | Description | Install |\n| ----- | ----------- | ------- |\n";

  // Generate table rows for each instruction file
  for (const file of instructionFiles) {
    const filePath = path.join(instructionsDir, file);
    const title = extractTitle(filePath);
    const link = encodeURI(collectionPath ? `instructions/${file}` : `instructions/${file}`);

    // Check if there's a description in the frontmatter
    const customDescription = extractDescription(filePath);

    // Create badges for installation links
    const badges = makeBadges(link, 'instructions', collectionPath);

    if (customDescription && customDescription !== "null") {
      // Use the description from frontmatter
      instructionsContent += `| [${title}](${link}) | ${customDescription} | ${badges} |\n`;
    } else {
      // Fallback to the default approach - use last word of title for description, removing trailing 's' if present
      const topic = title.split(" ").pop().replace(/s$/, "");
      instructionsContent += `| [${title}](${link}) | ${topic} specific coding standards and best practices | ${badges} |\n`;
    }
  }

  const sectionHeader = collectionPath ?
    "## 📋 Instructions\n\nCoding standards and best practices for this collection:" :
    TEMPLATES.instructionsSection;

  const sectionUsage = collectionPath ?
    "> 💡 **Usage**: Copy these instructions to your `.github/copilot-instructions.md` file or create task-specific `.github/.instructions.md` files in your workspace's `.github/instructions` folder." :
    TEMPLATES.instructionsUsage;

  return `${sectionHeader}\n\n${instructionsContent}\n${sectionUsage}`;
}

/**
 * Generate the prompts section with a table of all prompts
 */
function generatePromptsSection(promptsDir, collectionPath = '') {
  // Check if prompts directory exists
  if (!fs.existsSync(promptsDir)) {
    return '';
  }

  // Get all prompt files
  const promptFiles = fs
    .readdirSync(promptsDir)
    .filter((file) => file.endsWith(".prompt.md"))
    .sort();

  if (promptFiles.length === 0) {
    return '';
  }

  console.log(`Found ${promptFiles.length} prompt files in ${promptsDir}`);

  // Create table header
  let promptsContent =
    "| Title | Description | Install |\n| ----- | ----------- | ------- |\n";

  // Generate table rows for each prompt file
  for (const file of promptFiles) {
    const filePath = path.join(promptsDir, file);
    const title = extractTitle(filePath);
    const link = encodeURI(`prompts/${file}`);

    // Check if there's a description in the frontmatter
    const customDescription = extractDescription(filePath);

    // Create badges for installation links
    const badges = makeBadges(link, 'prompt', collectionPath);

    if (customDescription && customDescription !== "null") {
      promptsContent += `| [${title}](${link}) | ${customDescription} | ${badges} |\n`;
    } else {
      promptsContent += `| [${title}](${link}) | | ${badges} |\n`;
    }
  }

  const sectionHeader = collectionPath ?
    "## 🎯 Prompts\n\nReady-to-use prompt templates for this collection:" :
    TEMPLATES.promptsSection;

  const sectionUsage = collectionPath ?
    "> 💡 **Usage**: Use `/prompt-name` in VS Code chat, run `Chat: Run Prompt` command, or hit the run button while you have a prompt open." :
    TEMPLATES.promptsUsage;

  return `${sectionHeader}\n\n${promptsContent}\n${sectionUsage}`;
}

/**
 * Generate the chat modes section with a table of all chat modes
 */
function generateChatModesSection(chatmodesDir, collectionPath = '') {
  // Check if chatmodes directory exists
  if (!fs.existsSync(chatmodesDir)) {
    console.log(`Chat modes directory does not exist: ${chatmodesDir}`);
    return "";
  }

  // Get all chat mode files
  const chatmodeFiles = fs
    .readdirSync(chatmodesDir)
    .filter((file) => file.endsWith(".chatmode.md"))
    .sort();

  console.log(`Found ${chatmodeFiles.length} chat mode files in ${chatmodesDir}`);

  // If no chat modes, return empty string
  if (chatmodeFiles.length === 0) {
    return "";
  }

  // Create table header
  let chatmodesContent =
    "| Title | Description | Install |\n| ----- | ----------- | ------- |\n";

  // Generate table rows for each chat mode file
  for (const file of chatmodeFiles) {
    const filePath = path.join(chatmodesDir, file);
    const title = extractTitle(filePath);
    const link = encodeURI(`chatmodes/${file}`);

    // Check if there's a description in the frontmatter
    const customDescription = extractDescription(filePath);

    // Create badges for installation links
    const badges = makeBadges(link, 'chatmode', collectionPath);

    if (customDescription && customDescription !== "null") {
      chatmodesContent += `| [${title}](${link}) | ${customDescription} | ${badges} |\n`;
    } else {
      chatmodesContent += `| [${title}](${link}) | | ${badges} |\n`;
    }
  }

  const sectionHeader = collectionPath ?
    "## 🧩 Chat Modes\n\nCustom chat modes for this collection:" :
    TEMPLATES.chatmodesSection;

  const sectionUsage = collectionPath ?
    "> 💡 **Usage**: Create new chat modes using the command `Chat: Configure Chat Modes...`, then switch your chat mode in the Chat input from _Agent_ or _Ask_ to your own mode." :
    TEMPLATES.chatmodesUsage;

  return `${sectionHeader}\n\n${chatmodesContent}\n${sectionUsage}`;
}

/**
 * Generate the collections section with a table of all collections
 */
function generateCollectionsSection(collectionsDir) {
  // Get all collections
  const collections = getCollections(collectionsDir);

  if (collections.length === 0) {
    return '';
  }

  console.log(`Found ${collections.length} collections`);

  // Create table header
  let collectionsContent =
    "| Collection | Description | Contents |\n| ---------- | ----------- | -------- |\n";

  // Generate table rows for each collection
  for (const collection of collections) {
    const collectionPath = path.join(collectionsDir, collection);
    const title = collection.charAt(0).toUpperCase() + collection.slice(1);
    const link = `collections/${collection}/README.md`;

    // Get description
    const description = getCollectionDescription(collectionPath) ||
      `Specialized ${collection} prompts and instructions`;

    // Count contents
    const promptsDir = path.join(collectionPath, 'prompts');
    const instructionsDir = path.join(collectionPath, 'instructions');
    const chatmodesDir = path.join(collectionPath, 'chatmodes');

    let contents = [];

    if (fs.existsSync(promptsDir)) {
      const promptCount = fs.readdirSync(promptsDir).filter(f => f.endsWith('.prompt.md')).length;
      if (promptCount > 0) contents.push(`${promptCount} prompts`);
    }

    if (fs.existsSync(instructionsDir)) {
      const instructionCount = fs.readdirSync(instructionsDir).filter(f => f.endsWith('.md')).length;
      if (instructionCount > 0) contents.push(`${instructionCount} instructions`);
    }

    if (fs.existsSync(chatmodesDir)) {
      const chatmodeCount = fs.readdirSync(chatmodesDir).filter(f => f.endsWith('.chatmode.md')).length;
      if (chatmodeCount > 0) contents.push(`${chatmodeCount} chat modes`);
    }

    const contentsText = contents.length > 0 ? contents.join(', ') : 'No items';

    collectionsContent += `| [${title}](${link}) | ${description} | ${contentsText} |\n`;
  }

  return `${TEMPLATES.collectionsSection}\n\n${collectionsContent}\n${TEMPLATES.collectionsUsage}`;
}

/**
 * Generate README for a specific collection
 */
function generateCollectionReadme(collectionPath, collectionName) {
  const promptsDir = path.join(collectionPath, 'prompts');
  const instructionsDir = path.join(collectionPath, 'instructions');
  const chatmodesDir = path.join(collectionPath, 'chatmodes');

  const collectionPathForBadges = `collections/${collectionName}`;

  // Generate each section for the collection
  const sections = [];

  // Header
  sections.push(TEMPLATES.collectionHeader(collectionName));

  // Instructions section
  const instructionsSection = generateInstructionsSection(instructionsDir, collectionPathForBadges);
  if (instructionsSection) {
    sections.push(instructionsSection);
  }

  // Prompts section
  const promptsSection = generatePromptsSection(promptsDir, collectionPathForBadges);
  if (promptsSection) {
    sections.push(promptsSection);
  }

  // Chat modes section
  const chatmodesSection = generateChatModesSection(chatmodesDir, collectionPathForBadges);
  if (chatmodesSection) {
    sections.push(chatmodesSection);
  }

  // Add footer
  sections.push(`## 🔗 Related

- [Main Repository](../../) - Browse all available customizations
- [Contributing Guide](../../CONTRIBUTING.md) - How to contribute to this collection`);

  return sections.join('\n\n');
}
function generateReadme() {
  const instructionsDir = path.join(__dirname, "instructions");
  const promptsDir = path.join(__dirname, "prompts");
  const chatmodesDir = path.join(__dirname, "chatmodes");
  const collectionsDir = path.join(__dirname, "collections");

  // Generate each section
  const instructionsSection = generateInstructionsSection(instructionsDir);
  const promptsSection = generatePromptsSection(promptsDir);
  const chatmodesSection = generateChatModesSection(chatmodesDir);
  const collectionsSection = generateCollectionsSection(collectionsDir);

  // Build the complete README content with template sections
  let readmeContent = [TEMPLATES.header];

  // Add main sections
  if (instructionsSection) {
    readmeContent.push(instructionsSection);
  }

  if (promptsSection) {
    readmeContent.push(promptsSection);
  }

  // Only include chat modes section if we have any chat modes
  if (chatmodesSection) {
    readmeContent.push(chatmodesSection);
  }

  // Add collections section after chat modes if we have any
  if (collectionsSection) {
    readmeContent.push(collectionsSection);
  }

  // Add footer
  readmeContent.push(TEMPLATES.footer);

  return readmeContent.join("\n\n");
}

// Main execution
try {
  console.log("Generating README.md from scratch...");

  const readmePath = path.join(__dirname, "README.md");
  const newReadmeContent = generateReadme();

  // Check if the README file already exists
  if (fs.existsSync(readmePath)) {
    const originalContent = fs.readFileSync(readmePath, "utf8");
    const hasChanges = originalContent !== newReadmeContent;

    if (hasChanges) {
      fs.writeFileSync(readmePath, newReadmeContent);
      console.log("README.md updated successfully!");
    } else {
      console.log("README.md is already up to date. No changes needed.");
    }
  } else {
    // Create the README file if it doesn't exist
    fs.writeFileSync(readmePath, newReadmeContent);
    console.log("README.md created successfully!");
  }

  // Generate READMEs for all collections
  const collectionsDir = path.join(__dirname, "collections");
  const collections = getCollections(collectionsDir);

  console.log(`\nProcessing ${collections.length} collections...`);

  for (const collection of collections) {
    const collectionPath = path.join(collectionsDir, collection);
    const collectionReadmePath = path.join(collectionPath, "README.md");
    const newCollectionContent = generateCollectionReadme(collectionPath, collection);

    // Check if the collection README file already exists
    if (fs.existsSync(collectionReadmePath)) {
      const originalContent = fs.readFileSync(collectionReadmePath, "utf8");
      const hasChanges = originalContent !== newCollectionContent;

      if (hasChanges) {
        fs.writeFileSync(collectionReadmePath, newCollectionContent);
        console.log(`${collection}/README.md updated successfully!`);
      } else {
        console.log(`${collection}/README.md is already up to date. No changes needed.`);
      }
    } else {
      // Create the collection README file if it doesn't exist
      fs.writeFileSync(collectionReadmePath, newCollectionContent);
      console.log(`${collection}/README.md created successfully!`);
    }
  }

  console.log("\nAll README files processed successfully!");
} catch (error) {
  console.error(`Error generating README.md: ${error.message}`);
  process.exit(1);
}
