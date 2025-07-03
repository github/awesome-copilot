#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

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
          if (line.includes('title:')) {
            // Extract everything after 'title:'
            const afterTitle = line.substring(line.indexOf('title:') + 6).trim();
            // Remove quotes if present
            const cleanTitle = afterTitle.replace(/^['"]|['"]$/g, '');
            return cleanTitle;
          }
        }
      }

      // Reset for second pass
      inFrontmatter = false;
      frontmatterEnded = false;

      // Step 2: For prompt/chatmode/instructions files, look for heading after frontmatter
      if (filePath.includes(".prompt.md") || filePath.includes(".chatmode.md") || filePath.includes(".instructions.md")) {
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
          filePath.includes(".prompt.md") ? ".prompt.md" : 
          filePath.includes(".chatmode.md") ? ".chatmode.md" : ".instructions.md"
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
    path.basename(filePath, path.extname(filePath))
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

function updateInstructionsSection(
  currentReadme,
  instructionFiles,
  instructionsDir
) {
  // Look for the instructions section in the README
  const instructionsSectionRegex = /## 📋 Custom Instructions[\s\S]*?(?=\n## |\n\n## |$)/;
  const instructionsSection = currentReadme.match(instructionsSectionRegex);

  if (!instructionsSection && instructionFiles.length === 0) {
    console.log("No instructions section found in README and no instruction files to add.");
    return currentReadme;
  }

  // Extract existing instruction links from README (for reporting purposes)
  const existingInstructionLinks = [];
  const instructionLinkRegex = /\[.*?\]\(instructions\/(.+?)\)/g;
  let match;

  while ((match = instructionLinkRegex.exec(currentReadme)) !== null) {
    existingInstructionLinks.push(match[1]);
  }

  // Find new instructions that aren't already in the README
  const newInstructionFiles = instructionFiles.filter(
    (file) => !existingInstructionLinks.includes(file)
  );

  if (newInstructionFiles.length === 0) {
    console.log("No new instructions to add.");
  } else {
    console.log(`Found ${newInstructionFiles.length} new instructions to add.`);
  }

  let instructionsListContent = "\n\n";

  // Always regenerate the entire list to ensure descriptions are included
  for (const file of instructionFiles.sort()) {
    const filePath = path.join(instructionsDir, file);
    const title = extractTitle(filePath);
    const link = encodeURI(`instructions/${file}`);

    // Check if there's a description in the frontmatter
    const customDescription = extractDescription(filePath);

    if (customDescription && customDescription !== "null") {
      // Use the description from frontmatter
      instructionsListContent += `- [${title}](${link}) - ${customDescription}\n`;
    } else {
      // Fallback to the default approach - use last word of title for description, removing trailing 's' if present
      const topic = title.split(" ").pop().replace(/s$/, "");
      instructionsListContent += `- [${title}](${link}) - ${topic} specific coding standards and best practices\n`;
    }
  }

  // Replace the current instructions section with the updated one
  const newInstructionsSection =
    "## 📋 Custom Instructions\n\nTeam and project-specific instructions to enhance GitHub Copilot's behavior for specific technologies and coding practices:" +
    instructionsListContent +
    "\n> 💡 **Usage**: Copy these instructions to your `.github/copilot-instructions.md` file or create task-specific `.github/.instructions.md` files in your workspace's `.github/instructions` folder.";

  if (instructionsSection) {
    return currentReadme.replace(instructionsSection[0], newInstructionsSection);
  } else {
    // Instructions section doesn't exist, insert it before Prompts section
    const promptsPos = currentReadme.indexOf("## 🎯 Reusable Prompts");
    if (promptsPos !== -1) {
      return (
        currentReadme.slice(0, promptsPos) +
        newInstructionsSection +
        "\n\n" +
        currentReadme.slice(promptsPos)
      );
    } else {
      // Insert before Additional Resources section as fallback
      const additionalResourcesPos = currentReadme.indexOf("## 📚 Additional Resources");
      if (additionalResourcesPos !== -1) {
        return (
          currentReadme.slice(0, additionalResourcesPos) +
          newInstructionsSection +
          "\n\n" +
          currentReadme.slice(additionalResourcesPos)
        );
      }
    }
    return currentReadme;
  }
}

function updatePromptsSection(currentReadme, promptFiles, promptsDir) {
  // Look for the prompts section in the README
  const promptsSectionRegex = /## 🎯 Reusable Prompts[\s\S]*?(?=\n## |\n\n## |$)/;
  const promptsSection = currentReadme.match(promptsSectionRegex);

  if (!promptsSection && promptFiles.length === 0) {
    console.log("No prompts section found in README and no prompt files to add.");
    return currentReadme;
  }

  // Extract existing prompt links from README (for reporting purposes)
  const existingPromptLinks = [];
  const promptLinkRegex = /\[.*?\]\(prompts\/(.+?)\)/g;
  let match;

  while ((match = promptLinkRegex.exec(currentReadme)) !== null) {
    existingPromptLinks.push(match[1]);
  }

  // Find new prompts that aren't already in the README
  const newPromptFiles = promptFiles.filter(
    (file) => !existingPromptLinks.includes(file)
  );

  if (newPromptFiles.length === 0) {
    console.log("No new prompts to add.");
  } else {
    console.log(`Found ${newPromptFiles.length} new prompts to add.`);
  }

  let promptsListContent = "\n\n";

  // Always regenerate the entire list to ensure descriptions are included
  for (const file of promptFiles.sort()) {
    const filePath = path.join(promptsDir, file);
    const title = extractTitle(filePath);
    const description = extractDescription(filePath);
    const link = encodeURI(`prompts/${file}`);

    if (description && description !== "null") {
      promptsListContent += `- [${title}](${link}) - ${description}\n`;
    } else {
      promptsListContent += `- [${title}](${link})\n`;
    }
  }

  // Replace the current prompts section with the updated one
  const newPromptsSection =
    "## 🎯 Reusable Prompts\n\nReady-to-use prompt templates for specific development scenarios and tasks, defining prompt text with a specific mode, model, and available set of tools." +
    promptsListContent +
    "\n> 💡 **Usage**: Use `/prompt-name` in VS Code chat, run `Chat: Run Prompt` command, or hit the run button while you have a prompt open.";

  if (promptsSection) {
    return currentReadme.replace(promptsSection[0], newPromptsSection);
  } else {
    // Prompts section doesn't exist, insert it before Chat Modes section
    const chatModesPos = currentReadme.indexOf("## 🧩 Custom Chat Modes");
    if (chatModesPos !== -1) {
      return (
        currentReadme.slice(0, chatModesPos) +
        newPromptsSection +
        "\n\n" +
        currentReadme.slice(chatModesPos)
      );
    } else {
      // Insert before Additional Resources section as fallback
      const additionalResourcesPos = currentReadme.indexOf("## 📚 Additional Resources");
      if (additionalResourcesPos !== -1) {
        return (
          currentReadme.slice(0, additionalResourcesPos) +
          newPromptsSection +
          "\n\n" +
          currentReadme.slice(additionalResourcesPos)
        );
      }
    }
    return currentReadme;
  }
}

function updateChatModesSection(currentReadme, chatmodeFiles, chatmodesDir) {
  // No chat mode files, nothing to do
  if (chatmodeFiles.length === 0) {
    return currentReadme;
  }

  // Extract existing chat mode links from README (for reporting purposes)
  const existingChatModeLinks = [];
  const chatModeLinkRegex = /\[.*?\]\(chatmodes\/(.+?)\)/g;
  let match;

  while ((match = chatModeLinkRegex.exec(currentReadme)) !== null) {
    existingChatModeLinks.push(match[1]);
  }

  // Find new chat modes that aren't already in the README
  const newChatModeFiles = chatmodeFiles.filter(
    (file) => !existingChatModeLinks.includes(file)
  );

  if (newChatModeFiles.length === 0) {
    console.log("No new chat modes to add.");
  } else {
    console.log(`Found ${newChatModeFiles.length} new chat modes to add.`);
  }

  // Look for ANY existing chat modes section (with any emoji)
  const chatmodesSectionRegex = /## [🧩🎭].*Custom Chat Modes[\s\S]*?(?=\n## |\n\n## |$)/;
  const chatmodesSection = currentReadme.match(chatmodesSectionRegex);

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

function generateReadme() {
  const instructionsDir = path.join(__dirname, "instructions");
  const promptsDir = path.join(__dirname, "prompts");
  const chatmodesDir = path.join(__dirname, "chatmodes");
  const readmePath = path.join(__dirname, "README.md");

  // Check if README file exists
  if (!fs.existsSync(readmePath)) {
    console.error(
      "README.md not found! Please create a base README.md file first."
    );
    process.exit(1);
  }

  // Read the current README content
  let currentReadme = fs.readFileSync(readmePath, "utf8");

  // Get all instruction files
  const instructionFiles = fs
    .readdirSync(instructionsDir)
    .filter((file) => file.endsWith(".md"))
    .sort();

  // Get all prompt files - we'll use this to find new prompts
  const promptFiles = fs
    .readdirSync(promptsDir)
    .filter((file) => file.endsWith(".prompt.md"))
    .sort();

  // Get all chat mode files - we'll use this to update the chat modes section
  const chatmodeFiles = fs.existsSync(chatmodesDir)
    ? fs
        .readdirSync(chatmodesDir)
        .filter((file) => file.endsWith(".chatmode.md"))
        .sort()
    : [];

  // Update instructions section
  currentReadme = updateInstructionsSection(
    currentReadme,
    instructionFiles,
    instructionsDir
  );

  // Update prompts section
  currentReadme = updatePromptsSection(currentReadme, promptFiles, promptsDir);

  // Update chat modes section
  currentReadme = updateChatModesSection(
    currentReadme,
    chatmodeFiles,
    chatmodesDir
  );

  return currentReadme;
}

// Generate and write the README
const readmePath = path.join(__dirname, "README.md");
const originalReadme = fs.readFileSync(readmePath, "utf8");
const updatedReadme = generateReadme();

// Only write file if we have content to write
if (updatedReadme) {
  // Check if there are changes
  const hasChanges = originalReadme !== updatedReadme;
  
  if (hasChanges) {
    fs.writeFileSync(readmePath, updatedReadme);
    console.log("README.md updated successfully!");
    console.log("Changes detected in README.md after running update script.");
  } else {
    console.log("README.md is already up to date.");
    console.log("No changes to README.md after running update script.");
  }
}
