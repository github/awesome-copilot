#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseCollectionYaml } = require("./yaml-parser");

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

  collectionsSection: `## 📦 Collections

Curated collections of related prompts, instructions, and chat modes organized around specific themes, workflows, or use cases.`,

  collectionsUsage: `### How to Use Collections

**Browse Collections:**
- Explore themed collections that group related customizations
- Each collection includes prompts, instructions, and chat modes for specific workflows
- Collections make it easy to adopt comprehensive toolkits for particular scenarios

**Install Items:**
- Click install buttons for individual items within collections
- Or browse to the individual files to copy content manually
- Collections help you discover related customizations you might have missed`,
};

// Add error handling utility
/**
 * Safe file operation wrapper
 */
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
      let hasFrontmatter = false;

      for (const line of lines) {
        if (line.trim() === "---") {
          if (!inFrontmatter) {
            inFrontmatter = true;
            hasFrontmatter = true;
          } else if (!frontmatterEnded) {
            frontmatterEnded = true;
            break;
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

      // Step 2: For prompt/chatmode/instructions files, look for heading after frontmatter
      if (
        filePath.includes(".prompt.md") ||
        filePath.includes(".chatmode.md") ||
        filePath.includes(".instructions.md")
      ) {
        // If we had frontmatter, only look for headings after it ended
        if (hasFrontmatter) {
          let inFrontmatter2 = false;
          let frontmatterEnded2 = false;
          let inCodeBlock = false;

          for (const line of lines) {
            if (line.trim() === "---") {
              if (!inFrontmatter2) {
                inFrontmatter2 = true;
              } else if (inFrontmatter2 && !frontmatterEnded2) {
                frontmatterEnded2 = true;
              }
              continue;
            }

            // Track code blocks to ignore headings inside them
            if (frontmatterEnded2) {
              if (
                line.trim().startsWith("```") ||
                line.trim().startsWith("````")
              ) {
                inCodeBlock = !inCodeBlock;
                continue;
              }

              if (!inCodeBlock && line.startsWith("# ")) {
                return line.substring(2).trim();
              }
            }
          }
        } else {
          // No frontmatter, look for first heading (but not in code blocks)
          let inCodeBlock = false;
          for (const line of lines) {
            if (
              line.trim().startsWith("```") ||
              line.trim().startsWith("````")
            ) {
              inCodeBlock = !inCodeBlock;
              continue;
            }

            if (!inCodeBlock && line.startsWith("# ")) {
              return line.substring(2).trim();
            }
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

      // Step 4: For instruction files, look for the first heading (but not in code blocks)
      let inCodeBlock = false;
      for (const line of lines) {
        if (line.trim().startsWith("```") || line.trim().startsWith("````")) {
          inCodeBlock = !inCodeBlock;
          continue;
        }

        if (!inCodeBlock && line.startsWith("# ")) {
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
              const singleQuoteMatch = line.match(
                /^description:\s*'(.+?)'\s*$/
              );
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

// Map install types to aka.ms short links. Both VS Code and Insiders will use
// the same aka.ms target; the redirect base (vscode vs insiders) is preserved
// so VS Code or Insiders opens correctly but the installation URL is uniform.
const AKA_INSTALL_URLS = {
  instructions: "https://aka.ms/awesome-copilot/install/instructions",
  prompt: "https://aka.ms/awesome-copilot/install/prompt",
  mode: "https://aka.ms/awesome-copilot/install/chatmode",
};

function makeBadges(link, type) {
  const aka = AKA_INSTALL_URLS[type] || AKA_INSTALL_URLS.instructions;

  const vscodeUrl = `${aka}?url=${encodeURIComponent(
    `vscode:chat-${type}/install?url=${repoBaseUrl}/${link}`
  )}`;
  const insidersUrl = `${aka}?url=${encodeURIComponent(
    `vscode-insiders:chat-${type}/install?url=${repoBaseUrl}/${link}`
  )}`;

  return `[![Install in VS Code](${vscodeInstallImage})](${vscodeUrl})<br />[![Install in VS Code Insiders](${vscodeInsidersInstallImage})](${insidersUrl})`;
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
    .filter((file) => file.endsWith(".md"));

  // Map instruction files to objects with title for sorting
  const instructionEntries = instructionFiles.map((file) => {
    const filePath = path.join(instructionsDir, file);
    const title = extractTitle(filePath);
    return { file, filePath, title };
  });

  // Sort by title alphabetically
  instructionEntries.sort((a, b) => a.title.localeCompare(b.title));

  console.log(`Found ${instructionEntries.length} instruction files`);

  // Return empty string if no files found
  if (instructionEntries.length === 0) {
    return "";
  }

  // Create table header
  let instructionsContent =
    "| Title | Description |\n| ----- | ----------- |\n";

  // Generate table rows for each instruction file
  for (const entry of instructionEntries) {
    const { file, filePath, title } = entry;
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
    .filter((file) => file.endsWith(".prompt.md"));

  // Map prompt files to objects with title for sorting
  const promptEntries = promptFiles.map((file) => {
    const filePath = path.join(promptsDir, file);
    const title = extractTitle(filePath);
    return { file, filePath, title };
  });

  // Sort by title alphabetically
  promptEntries.sort((a, b) => a.title.localeCompare(b.title));

  console.log(`Found ${promptEntries.length} prompt files`);

  // Return empty string if no files found
  if (promptEntries.length === 0) {
    return "";
  }

  // Create table header
  let promptsContent = "| Title | Description |\n| ----- | ----------- |\n";

  // Generate table rows for each prompt file
  for (const entry of promptEntries) {
    const { file, filePath, title } = entry;
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
    .filter((file) => file.endsWith(".chatmode.md"));

  // Map chat mode files to objects with title for sorting
  const chatmodeEntries = chatmodeFiles.map((file) => {
    const filePath = path.join(chatmodesDir, file);
    const title = extractTitle(filePath);
    return { file, filePath, title };
  });

  // Sort by title alphabetically
  chatmodeEntries.sort((a, b) => a.title.localeCompare(b.title));

  console.log(`Found ${chatmodeEntries.length} chat mode files`);

  // If no chat modes, return empty string
  if (chatmodeEntries.length === 0) {
    return "";
  }

  // Create table header
  let chatmodesContent = "| Title | Description |\n| ----- | ----------- |\n";

  // Generate table rows for each chat mode file
  for (const entry of chatmodeEntries) {
    const { file, filePath, title } = entry;
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

/**
 * Generate the collections section with a table of all collections
 */
function generateCollectionsSection(collectionsDir) {
  // Check if collections directory exists, create it if it doesn't
  if (!fs.existsSync(collectionsDir)) {
    console.log("Collections directory does not exist, creating it...");
    fs.mkdirSync(collectionsDir, { recursive: true });
  }

  // Get all collection files
  const collectionFiles = fs
    .readdirSync(collectionsDir)
    .filter((file) => file.endsWith(".collection.yml"));

  // Map collection files to objects with name for sorting
  const collectionEntries = collectionFiles
    .map((file) => {
      const filePath = path.join(collectionsDir, file);
      const collection = parseCollectionYaml(filePath);

      if (!collection) {
        console.warn(`Failed to parse collection: ${file}`);
        return null;
      }

      const collectionId =
        collection.id || path.basename(file, ".collection.yml");
      const name = collection.name || collectionId;
      return { file, filePath, collection, collectionId, name };
    })
    .filter((entry) => entry !== null); // Remove failed parses

  // Sort by name alphabetically
  collectionEntries.sort((a, b) => a.name.localeCompare(b.name));

  console.log(`Found ${collectionEntries.length} collection files`);

  // If no collections, return empty string
  if (collectionEntries.length === 0) {
    return "";
  }

  // Create table header
  let collectionsContent =
    "| Name | Description | Items | Tags |\n| ---- | ----------- | ----- | ---- |\n";

  // Generate table rows for each collection file
  for (const entry of collectionEntries) {
    const { collection, collectionId, name } = entry;
    const description = collection.description || "No description";
    const itemCount = collection.items ? collection.items.length : 0;
    const tags = collection.tags ? collection.tags.join(", ") : "";

    const link = `collections/${collectionId}.md`;

    collectionsContent += `| [${name}](${link}) | ${description} | ${itemCount} items | ${tags} |\n`;
  }

  return `${TEMPLATES.collectionsSection}\n${TEMPLATES.collectionsUsage}\n\n${collectionsContent}`;
}

/**
 * Generate individual collection README file
 */
function generateCollectionReadme(collection, collectionId) {
  if (!collection || !collection.items) {
    return `# ${collectionId}\n\nCollection not found or invalid.`;
  }

  const name = collection.name || collectionId;
  const description = collection.description || "No description provided.";
  const tags = collection.tags ? collection.tags.join(", ") : "None";

  let content = `# ${name}\n\n${description}\n\n`;

  if (collection.tags && collection.tags.length > 0) {
    content += `**Tags:** ${tags}\n\n`;
  }

  content += `## Items in this Collection\n\n`;
  content += `| Title | Type | Description |\n| ----- | ---- | ----------- |\n`;

  let collectionUsageHeader = "## Collection Usage\n\n";
  let collectionUsageContent = [];

  // Sort items based on display.ordering setting
  const items = [...collection.items];
  if (collection.display?.ordering === "alpha") {
    items.sort((a, b) => {
      const titleA = extractTitle(path.join(__dirname, a.path));
      const titleB = extractTitle(path.join(__dirname, b.path));
      return titleA.localeCompare(titleB);
    });
  }

  for (const item of items) {
    const filePath = path.join(__dirname, item.path);
    const title = extractTitle(filePath);
    const description = extractDescription(filePath) || "No description";

    const typeDisplay =
      item.kind === "chat-mode"
        ? "Chat Mode"
        : item.kind === "instruction"
        ? "Instruction"
        : "Prompt";
    const link = `../${item.path}`;

    // Create install badges for each item
    const badges = makeBadges(
      item.path,
      item.kind === "instruction"
        ? "instructions"
        : item.kind === "chat-mode"
        ? "mode"
        : "prompt"
    );

    const usageDescription = item.usage
      ? `${description} [see usage](#${title
          .replace(/\s+/g, "-")
          .toLowerCase()})`
      : description;

    content += `| [${title}](${link})<br />${badges} | ${typeDisplay} | ${usageDescription} |\n`;
    // Generate Usage section for each collection
    if (item.usage && item.usage.trim()) {
      collectionUsageContent.push(
        `### ${title}\n\n${item.usage.trim()}\n\n---\n\n`
      );
    }
  }

  // Append the usage section if any items had usage defined
  if (collectionUsageContent.length > 0) {
    content += `\n${collectionUsageHeader}${collectionUsageContent.join("")}`;
  } else if (collection.display?.show_badge) {
    content += "\n---\n";
  }

  // Optional badge note at the end if show_badge is true
  if (collection.display?.show_badge) {
    content += `*This collection includes ${
      items.length
    } curated items for ${name.toLowerCase()}.*`;
  }

  return content;
}

// Utility: write file only if content changed
function writeFileIfChanged(filePath, content) {
  const exists = fs.existsSync(filePath);
  if (exists) {
    const original = fs.readFileSync(filePath, "utf8");
    if (original === content) {
      console.log(
        `${path.basename(filePath)} is already up to date. No changes needed.`
      );
      return;
    }
  }
  fs.writeFileSync(filePath, content);
  console.log(
    `${path.basename(filePath)} ${exists ? "updated" : "created"} successfully!`
  );
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
  const collectionsDir = path.join(__dirname, "collections");

  // Compose headers for standalone files by converting section headers to H1
  const instructionsHeader = TEMPLATES.instructionsSection.replace(
    /^##\s/m,
    "# "
  );
  const promptsHeader = TEMPLATES.promptsSection.replace(/^##\s/m, "# ");
  const chatmodesHeader = TEMPLATES.chatmodesSection.replace(/^##\s/m, "# ");
  const collectionsHeader = TEMPLATES.collectionsSection.replace(
    /^##\s/m,
    "# "
  );

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

  // Generate collections README
  const collectionsReadme = buildCategoryReadme(
    generateCollectionsSection,
    collectionsDir,
    collectionsHeader,
    TEMPLATES.collectionsUsage
  );

  // Write category outputs
  writeFileIfChanged(
    path.join(__dirname, "README.instructions.md"),
    instructionsReadme
  );
  writeFileIfChanged(path.join(__dirname, "README.prompts.md"), promptsReadme);
  writeFileIfChanged(
    path.join(__dirname, "README.chatmodes.md"),
    chatmodesReadme
  );
  writeFileIfChanged(
    path.join(__dirname, "README.collections.md"),
    collectionsReadme
  );

  // Generate individual collection README files
  if (fs.existsSync(collectionsDir)) {
    console.log("Generating individual collection README files...");

    const collectionFiles = fs
      .readdirSync(collectionsDir)
      .filter((file) => file.endsWith(".collection.yml"));

    for (const file of collectionFiles) {
      const filePath = path.join(collectionsDir, file);
      const collection = parseCollectionYaml(filePath);

      if (collection) {
        const collectionId =
          collection.id || path.basename(file, ".collection.yml");
        const readmeContent = generateCollectionReadme(
          collection,
          collectionId
        );
        const readmeFile = path.join(collectionsDir, `${collectionId}.md`);
        writeFileIfChanged(readmeFile, readmeContent);
      }
    }
  }
} catch (error) {
  console.error(`Error generating category README files: ${error.message}`);
  process.exit(1);
}
