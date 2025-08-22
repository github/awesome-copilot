#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Template sections for the README
const TEMPLATES = {
  instructionsSection: `## 📋 Custom Instructions

Team and project-specific instructions to enhance GitHub Copilot's behavior for specific technologies and coding practices.`,

  instructionsUsage: `### How to Use Custom Instructions

**To Install:**
- Click the **VS Code** or **VS Code Insiders** install button for the instruction you want to use
- Download the \`*.instructions.md\` file and manually add it to your project's instruction collection

**To Use/Apply:**
- Copy these instructions to your \`.github/copilot-instructions.md\` file in your workspace
- Create task-specific \`.github/.instructions.md\` files in your workspace's \`.github/instructions\` folder
- Instructions automatically apply to Copilot behavior once installed in your workspace`,

  promptsSection: `## 🎯 Reusable Prompts

Ready-to-use prompt templates for specific development scenarios and tasks, defining prompt text with a specific mode, model, and available set of tools.`,

  promptsUsage: `### How to Use Reusable Prompts

**To Install:**
- Click the **VS Code** or **VS Code Insiders** install button for the prompt you want to use
- Download the \`*.prompt.md\` file and manually add it to your prompt collection

**To Run/Execute:**
- Use \`/prompt-name\` in VS Code chat after installation
- Run the \`Chat: Run Prompt\` command from the Command Palette
- Hit the run button while you have a prompt file open in VS Code`,

  chatmodesSection: `## 💭 Custom Chat Modes

Custom chat modes define specific behaviors and tools for GitHub Copilot Chat, enabling enhanced context-aware assistance for particular tasks or workflows.`,

  chatmodesUsage: `### How to Use Custom Chat Modes

**To Install:**
- Click the **VS Code** or **VS Code Insiders** install button for the chat mode you want to use
- Download the \`*.chatmode.md\` file and manually install it in VS Code using the Command Palette

**To Activate/Use:**
- Import the chat mode configuration into your VS Code settings
- Access the installed chat modes through the VS Code Chat interface
- Select the desired chat mode from the available options in VS Code Chat`,
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
              /^description:\s*['"]?(.+?)['"]?\s*$/
            );
            if (descriptionMatch) {
              let description = descriptionMatch[1];

              // Check if the description is wrapped in single quotes and handle escaped quotes
              const singleQuoteMatch = line.match(/^description:\s*'(.+?)'\s*$/);
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
function makeBadges(link, type) {
  return `[![Install in VS Code](${vscodeInstallImage})](${vscodeBaseUrl}${encodeURIComponent(
    `vscode:chat-${type}/install?url=${repoBaseUrl}/${link})`
  )}<br />[![Install in VS Code](${vscodeInsidersInstallImage})](${vscodeInsidersBaseUrl}${encodeURIComponent(
    `vscode-insiders:chat-${type}/install?url=${repoBaseUrl}/${link})`
  )}`;
}

/**
 * Generate the instructions section with a table of all instructions
 */
function generateInstructionsSection(instructionsDir) {
  // Check if directory exists
  if (!fs.existsSync(instructionsDir)) {
    return "";
  }

  // Get all instruction files
  const instructionFiles = fs
    .readdirSync(instructionsDir)
    .filter((file) => file.endsWith(".md"))
    .sort();

  console.log(`Found ${instructionFiles.length} instruction files`);

  // Return empty string if no files found
  if (instructionFiles.length === 0) {
    return "";
  }

  // Create table header
  let instructionsContent =
    "| Title | Description |\n| ----- | ----------- |\n";

  // Generate table rows for each instruction file
  for (const file of instructionFiles) {
    const filePath = path.join(instructionsDir, file);
    const title = extractTitle(filePath);
    const link = encodeURI(`instructions/${file}`);

    // Check if there's a description in the frontmatter
    const customDescription = extractDescription(filePath);

    // Create badges for installation links
    const badges = makeBadges(link, "instructions");

    if (customDescription && customDescription !== "null") {
      // Use the description from frontmatter
      instructionsContent += `| [${title}](${link})<br />${badges} | ${customDescription} |\n`;
    } else {
      // Fallback to the default approach - use last word of title for description, removing trailing 's' if present
      const topic = title.split(" ").pop().replace(/s$/, "");
      instructionsContent += `| [${title}](${link})<br />${badges} | ${topic} specific coding standards and best practices |\n`;
    }
  }

  return `${TEMPLATES.instructionsSection}\n${TEMPLATES.instructionsUsage}\n\n${instructionsContent}`;
}

/**
 * Generate the prompts section with a table of all prompts
 */
function generatePromptsSection(promptsDir) {
  // Check if directory exists
  if (!fs.existsSync(promptsDir)) {
    return "";
  }

  // Get all prompt files
  const promptFiles = fs
    .readdirSync(promptsDir)
    .filter((file) => file.endsWith(".prompt.md"))
    .sort();

  console.log(`Found ${promptFiles.length} prompt files`);

  // Return empty string if no files found
  if (promptFiles.length === 0) {
    return "";
  }

  // Create table header
  let promptsContent =
    "| Title | Description |\n| ----- | ----------- |\n";

  // Generate table rows for each prompt file
  for (const file of promptFiles) {
    const filePath = path.join(promptsDir, file);
    const title = extractTitle(filePath);
    const link = encodeURI(`prompts/${file}`);

    // Check if there's a description in the frontmatter
    const customDescription = extractDescription(filePath);

    // Create badges for installation links
    const badges = makeBadges(link, "prompt");

    if (customDescription && customDescription !== "null") {
      promptsContent += `| [${title}](${link})<br />${badges} | ${customDescription} |\n`;
    } else {
      promptsContent += `| [${title}](${link})<br />${badges} | | |\n`;
    }
  }

  return `${TEMPLATES.promptsSection}\n${TEMPLATES.promptsUsage}\n\n${promptsContent}`;
}

/**
 * Generate the chat modes section with a table of all chat modes
 */
function generateChatModesSection(chatmodesDir) {
  // Check if chatmodes directory exists
  if (!fs.existsSync(chatmodesDir)) {
    console.log("Chat modes directory does not exist");
    return "";
  }

  // Get all chat mode files
  const chatmodeFiles = fs
    .readdirSync(chatmodesDir)
    .filter((file) => file.endsWith(".chatmode.md"))
    .sort();

  console.log(`Found ${chatmodeFiles.length} chat mode files`);

  // If no chat modes, return empty string
  if (chatmodeFiles.length === 0) {
    return "";
  }

  // Create table header
  let chatmodesContent =
    "| Title | Description |\n| ----- | ----------- |\n";

  // Generate table rows for each chat mode file
  for (const file of chatmodeFiles) {
    const filePath = path.join(chatmodesDir, file);
    const title = extractTitle(filePath);
    const link = encodeURI(`chatmodes/${file}`);

    // Check if there's a description in the frontmatter
    const customDescription = extractDescription(filePath);

    // Create badges for installation links
    const badges = makeBadges(link, "mode");

    if (customDescription && customDescription !== "null") {
      chatmodesContent += `| [${title}](${link})<br />${badges} | ${customDescription} |\n`;
    } else {
      chatmodesContent += `| [${title}](${link})<br />${badges} | | |\n`;
    }
  }

  return `${TEMPLATES.chatmodesSection}\n${TEMPLATES.chatmodesUsage}\n\n${chatmodesContent}`;
}

// Utility: write file only if content changed
function writeFileIfChanged(filePath, content) {
  const exists = fs.existsSync(filePath);
  if (exists) {
    const original = fs.readFileSync(filePath, "utf8");
    if (original === content) {
      console.log(`${path.basename(filePath)} is already up to date. No changes needed.`);
      return;
    }
  }
  fs.writeFileSync(filePath, content);
  console.log(`${path.basename(filePath)} ${exists ? "updated" : "created"} successfully!`);
}

// Build per-category README content using existing generators, upgrading headings to H1
function buildCategoryReadme(sectionBuilder, dirPath, headerLine, usageLine) {
  const section = sectionBuilder(dirPath);
  if (section && section.trim()) {
    // Upgrade the first markdown heading level from ## to # for standalone README files
    return section.replace(/^##\s/m, "# ");
  }
  // Fallback content when no entries are found
  return `${headerLine}\n\n${usageLine}\n\n_No entries found yet._`;
}

// Main execution
try {
  console.log("Generating category README files...");

  const instructionsDir = path.join(__dirname, "instructions");
  const promptsDir = path.join(__dirname, "prompts");
  const chatmodesDir = path.join(__dirname, "chatmodes");

  // Compose headers for standalone files by converting section headers to H1
  const instructionsHeader = TEMPLATES.instructionsSection.replace(/^##\s/m, "# ");
  const promptsHeader = TEMPLATES.promptsSection.replace(/^##\s/m, "# ");
  const chatmodesHeader = TEMPLATES.chatmodesSection.replace(/^##\s/m, "# ");

  const instructionsReadme = buildCategoryReadme(
    generateInstructionsSection,
    instructionsDir,
    instructionsHeader,
    TEMPLATES.instructionsUsage
  );
  const promptsReadme = buildCategoryReadme(
    generatePromptsSection,
    promptsDir,
    promptsHeader,
    TEMPLATES.promptsUsage
  );
  const chatmodesReadme = buildCategoryReadme(
    generateChatModesSection,
    chatmodesDir,
    chatmodesHeader,
    TEMPLATES.chatmodesUsage
  );

  // Write outputs
  writeFileIfChanged(path.join(__dirname, "README.instructions.md"), instructionsReadme);
  writeFileIfChanged(path.join(__dirname, "README.prompts.md"), promptsReadme);
  writeFileIfChanged(path.join(__dirname, "README.chatmodes.md"), chatmodesReadme);
} catch (error) {
  console.error(`Error generating category README files: ${error.message}`);
  process.exit(1);
}
