#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Template sections for the README
const TEMPLATES = {
  header: `# 🤖 Awesome GitHub Copilot Customizations

Enhance your GitHub Copilot experience with community-contributed instructions, prompts, and configurations. Get consistent AI assistance that follows your team's coding standards and project requirements.

## 🎯 GitHub Copilot Customization Features

GitHub Copilot provides three main ways to customize AI responses and tailor assistance to your specific workflows, team guidelines, and project requirements:

| **🔧 Custom Instructions** | **📝 Reusable Prompts** | **🧩 Custom Chat Modes** |
| --- | --- | --- |
| Define common guidelines for tasks like code generation, reviews, and commit messages. Describe *how* tasks should be performed<br><br>**Benefits:**<br>• Automatic inclusion in every chat request<br>• Repository-wide consistency<br>• Multiple implementation options | Create reusable, standalone prompts for specific tasks. Describe *what* should be done with optional task-specific guidelines<br><br>**Benefits:**<br>• Eliminate repetitive prompt writing<br>• Shareable across teams<br>• Support for variables and dependencies | Define chat behavior, available tools, and codebase interaction patterns within specific boundaries for each request<br><br>**Benefits:**<br>• Context-aware assistance<br>• Tool configuration<br>• Role-specific workflows |

> **💡 Pro Tip:** Custom instructions only affect Copilot Chat (not inline code completions). You can combine all three customization types - use custom instructions for general guidelines, prompt files for specific tasks, and chat modes to control the interaction context.


## 📝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on how to submit new instructions and prompts.`,

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
      let frontmatterEnded = false;

      // For multi-line descriptions
      let isMultilineDescription = false;
      let multilineDescription = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.trim() === "---") {
          if (!inFrontmatter) {
            inFrontmatter = true;
          } else if (inFrontmatter && !frontmatterEnded) {
            frontmatterEnded = true;
            break;
          }
          continue;
        }

        if (inFrontmatter && !frontmatterEnded) {
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
              isMultilineDescription = false;
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
              return descriptionMatch[1];
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
 * Generate the instructions section with an alphabetical list of all instructions
 */
function generateInstructionsSection(instructionsDir) {
  // Get all instruction files
  const instructionFiles = fs
    .readdirSync(instructionsDir)
    .filter((file) => file.endsWith(".md"))
    .sort();

  console.log(`Found ${instructionFiles.length} instruction files`);

  let instructionsContent = "";

  // Generate list items for each instruction file
  for (const file of instructionFiles) {
    const filePath = path.join(instructionsDir, file);
    const title = extractTitle(filePath);
    const link = encodeURI(`instructions/${file}`);

    // Check if there's a description in the frontmatter
    const customDescription = extractDescription(filePath);

    if (customDescription && customDescription !== "null") {
      // Use the description from frontmatter
      instructionsContent += `- [${title}](${link}) - ${customDescription}\n`;
    } else {
      // Fallback to the default approach - use last word of title for description, removing trailing 's' if present
      const topic = title.split(" ").pop().replace(/s$/, "");
      instructionsContent += `- [${title}](${link}) - ${topic} specific coding standards and best practices\n`;
    }
  }

  return `${TEMPLATES.instructionsSection}\n\n${instructionsContent}\n${TEMPLATES.instructionsUsage}`;
}

/**
 * Generate the prompts section with an alphabetical list of all prompts
 */
function generatePromptsSection(promptsDir) {
  // Get all prompt files
  const promptFiles = fs
    .readdirSync(promptsDir)
    .filter((file) => file.endsWith(".prompt.md"))
    .sort();

  console.log(`Found ${promptFiles.length} prompt files`);

  let promptsContent = "";

  // Generate list items for each prompt file
  for (const file of promptFiles) {
    const filePath = path.join(promptsDir, file);
    const title = extractTitle(filePath);
    const link = encodeURI(`prompts/${file}`);

    // Check if there's a description in the frontmatter
    const customDescription = extractDescription(filePath);

    if (customDescription && customDescription !== "null") {
      promptsContent += `- [${title}](${link}) - ${customDescription}\n`;
    } else {
      promptsContent += `- [${title}](${link})\n`;
    }
  }

  return `${TEMPLATES.promptsSection}\n\n${promptsContent}\n${TEMPLATES.promptsUsage}`;
}

/**
 * Generate the chat modes section with an alphabetical list of all chat modes
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

  let chatmodesContent = "";

  // Generate list items for each chat mode file
  for (const file of chatmodeFiles) {
    const filePath = path.join(chatmodesDir, file);
    const title = extractTitle(filePath);
    const link = encodeURI(`chatmodes/${file}`);

    // Check if there's a description in the frontmatter
    const customDescription = extractDescription(filePath);

    if (customDescription && customDescription !== "null") {
      chatmodesContent += `- [${title}](${link}) - ${customDescription}\n`;
    } else {
      chatmodesContent += `- [${title}](${link})\n`;
    }
  }

  return `${TEMPLATES.chatmodesSection}\n\n${chatmodesContent}\n${TEMPLATES.chatmodesUsage}`;

  if (chatmodesSection) {
    let chatmodesListContent = "\n\n";

    // Always regenerate the entire list to ensure descriptions are included
    for (const file of chatmodeFiles.sort()) {
      const filePath = path.join(chatmodesDir, file);
      const title = extractTitle(filePath);
      const link = encodeURI(`chatmodes/${file}`);

      // Check if there's a description in the frontmatter
      const customDescription = extractDescription(filePath);

      if (customDescription && customDescription !== "null") {
        // Use the description from frontmatter
        chatmodesListContent += `- [${title}](${link}) - ${customDescription}\n`;
      } else {
        // Just add a link without description
        chatmodesListContent += `- [${title}](${link})\n`;
      }
    }

    // Replace the current chat modes section with the updated one
    const newChatmodesSection =
      "## 🧩 Custom Chat Modes\n\nCustom chat modes define specific behaviors and tools for GitHub Copilot Chat, enabling enhanced context-aware assistance for particular tasks or workflows." +
      chatmodesListContent +
      "\n> 💡 **Usage**: Create new chat modes using the command `Chat: Configure Chat Modes...`, then switch your chat mode in the Chat input from _Agent_ or _Ask_ to your own mode.";

    return currentReadme.replace(chatmodesSection[0], newChatmodesSection);
  } else {
    // Chat modes section doesn't exist yet but we have chat mode files
    console.log(
      "Creating new chat modes section with all available chat modes."
    );

    const chatmodesListContent = chatmodeFiles
      .sort()
      .map((file) => {
        const filePath = path.join(chatmodesDir, file);
        const title = extractTitle(filePath);
        const link = `chatmodes/${file}`;
        const customDescription = extractDescription(filePath);

        if (customDescription) {
          return `- [${title}](${link}) - ${customDescription}`;
        } else {
          return `- [${title}](${link})`;
        }
      })
      .join("\n");

    const newChatmodesSection =
      "## 🧩 Custom Chat Modes\n\n" +
      "Custom chat modes define specific behaviors and tools for GitHub Copilot Chat, enabling enhanced context-aware assistance for particular tasks or workflows.\n\n" +
      chatmodesListContent +
      "\n\n> 💡 **Usage**: Create new chat modes using the command `Chat: Configure Chat Modes...`, then switch your chat mode in the Chat input from _Agent_ or _Ask_ to your own mode.\n";

    // Insert before Additional Resources section
    const additionalResourcesPos = currentReadme.indexOf(
      "## 📚 Additional Resources"
    );
    if (additionalResourcesPos !== -1) {
      return (
        currentReadme.slice(0, additionalResourcesPos) +
        newChatmodesSection +
        "\n" +
        currentReadme.slice(additionalResourcesPos)
      );
    }

    return currentReadme;
  }
}

/**
 * Generate the complete README.md content from scratch
 */
function generateReadme() {
  const instructionsDir = path.join(__dirname, "instructions");
  const promptsDir = path.join(__dirname, "prompts");
  const chatmodesDir = path.join(__dirname, "chatmodes");

  // Generate each section
  const instructionsSection = generateInstructionsSection(instructionsDir);
  const promptsSection = generatePromptsSection(promptsDir);
  const chatmodesSection = generateChatModesSection(chatmodesDir);

  // Build the complete README content with template sections
  let readmeContent = [TEMPLATES.header, instructionsSection, promptsSection];

  // Only include chat modes section if we have any chat modes
  if (chatmodesSection) {
    readmeContent.push(chatmodesSection);
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
} catch (error) {
  console.error(`Error generating README.md: ${error.message}`);
  process.exit(1);
}
