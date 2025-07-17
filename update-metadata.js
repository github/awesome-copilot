#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the JSON schema to understand the structure
const schemaPath = path.join(__dirname, 'frontmatter-schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

// Define the directories to process
const directories = {
  chatmodes: path.join(__dirname, 'chatmodes'),
  instructions: path.join(__dirname, 'instructions'),
  prompts: path.join(__dirname, 'prompts')
};

// Simple YAML parser for frontmatter
function parseSimpleYaml(yamlContent) {
  const result = {};
  const lines = yamlContent.split('\n');
  let currentKey = null;
  let currentValue = '';
  let inArray = false;
  let arrayItems = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check if this is a key-value pair
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex !== -1 && !trimmed.startsWith('-')) {
      // Finish previous key if we were building one
      if (currentKey) {
        if (inArray) {
          result[currentKey] = arrayItems;
          arrayItems = [];
          inArray = false;
        } else {
          result[currentKey] = currentValue.trim();
        }
      }

      currentKey = trimmed.substring(0, colonIndex).trim();
      currentValue = trimmed.substring(colonIndex + 1).trim();

      // Remove quotes if present
      if ((currentValue.startsWith('"') && currentValue.endsWith('"')) ||
          (currentValue.startsWith("'") && currentValue.endsWith("'"))) {
        currentValue = currentValue.slice(1, -1);
      }

      // Check if this is an array
      if (currentValue.startsWith('[') && currentValue.endsWith(']')) {
        const arrayContent = currentValue.slice(1, -1);
        if (arrayContent.trim()) {
          result[currentKey] = arrayContent.split(',').map(item => {
            item = item.trim();
            // Remove quotes from array items
            if ((item.startsWith('"') && item.endsWith('"')) ||
                (item.startsWith("'") && item.endsWith("'"))) {
              item = item.slice(1, -1);
            }
            return item;
          });
        } else {
          result[currentKey] = [];
        }
        currentKey = null;
        currentValue = '';
      } else if (currentValue === '' || currentValue === '[]') {
        // Empty value or empty array, might be multi-line
        if (currentValue === '[]') {
          result[currentKey] = [];
          currentKey = null;
          currentValue = '';
        } else {
          // Check if next line starts with a dash (array item)
          if (i + 1 < lines.length && lines[i + 1].trim().startsWith('-')) {
            inArray = true;
            arrayItems = [];
          }
        }
      }
    } else if (trimmed.startsWith('-') && currentKey && inArray) {
      // Array item
      let item = trimmed.substring(1).trim();
      // Remove quotes
      if ((item.startsWith('"') && item.endsWith('"')) ||
          (item.startsWith("'") && item.endsWith("'"))) {
        item = item.slice(1, -1);
      }
      arrayItems.push(item);
    } else if (currentKey && !inArray) {
      // Multi-line value
      currentValue += ' ' + trimmed;
    }
  }

  // Finish the last key
  if (currentKey) {
    if (inArray) {
      result[currentKey] = arrayItems;
    } else {
      let finalValue = currentValue.trim();
      // Remove quotes if present
      if ((finalValue.startsWith('"') && finalValue.endsWith('"')) ||
          (finalValue.startsWith("'") && finalValue.endsWith("'"))) {
        finalValue = finalValue.slice(1, -1);
      }
      result[currentKey] = finalValue;
    }
  }

  return result;
}

// Function to extract frontmatter from a markdown file
function extractFrontmatter(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove BOM if present (handles files with Byte Order Mark)
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }

  // Check if the file starts with frontmatter
  if (!content.startsWith('---')) {
    return null;
  }

  const lines = content.split('\n');
  let frontmatterEnd = -1;

  // Find the end of frontmatter
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      frontmatterEnd = i;
      break;
    }
  }

  if (frontmatterEnd === -1) {
    return null;
  }

  // Extract frontmatter content
  const frontmatterContent = lines.slice(1, frontmatterEnd).join('\n');

  try {
    return parseSimpleYaml(frontmatterContent);
  } catch (error) {
    console.error(`Error parsing frontmatter in ${filePath}:`, error.message);
    return null;
  }
}

// Function to process files in a directory
function processDirectory(dirPath, fileExtension) {
  const files = fs.readdirSync(dirPath)
    .filter(file => file.endsWith(fileExtension))
    .sort();

  const results = [];

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const frontmatter = extractFrontmatter(filePath);

    if (frontmatter) {
      const result = {
        filename: file,
        ...frontmatter
      };

      // Ensure description is present (required by schema)
      if (!result.description) {
        console.warn(`Warning: No description found in ${file}, adding placeholder`);
        result.description = 'No description provided';
      }

      results.push(result);
    } else {
      console.warn(`Warning: No frontmatter found in ${file}, skipping`);
    }
  }

  return results;
}

// Process all directories
const metadata = {
  chatmodes: processDirectory(directories.chatmodes, '.chatmode.md'),
  instructions: processDirectory(directories.instructions, '.instructions.md'),
  prompts: processDirectory(directories.prompts, '.prompt.md')
};

// Write the metadata.json file
const outputPath = path.join(__dirname, 'metadata.json');
fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));

console.log(`Extracted frontmatter from ${metadata.chatmodes.length} chatmode files`);
console.log(`Extracted frontmatter from ${metadata.instructions.length} instruction files`);
console.log(`Extracted frontmatter from ${metadata.prompts.length} prompt files`);
console.log(`Metadata written to ${outputPath}`);

// Validate that required fields are present
let hasErrors = false;

// Check chatmodes
metadata.chatmodes.forEach(chatmode => {
  if (!chatmode.filename || !chatmode.description) {
    console.error(`Error: Chatmode missing required fields: ${chatmode.filename || 'unknown'}`);
    hasErrors = true;
  }
});

// Check instructions
metadata.instructions.forEach(instruction => {
  if (!instruction.filename || !instruction.description) {
    console.error(`Error: Instruction missing required fields: ${instruction.filename || 'unknown'}`);
    hasErrors = true;
  }
});

// Check prompts
metadata.prompts.forEach(prompt => {
  if (!prompt.filename || !prompt.description) {
    console.error(`Error: Prompt missing required fields: ${prompt.filename || 'unknown'}`);
    hasErrors = true;
  }
});

if (hasErrors) {
  console.error('Some files are missing required fields. Please check the output above.');
  process.exit(1);
} else {
  console.log('All files have required fields. Metadata extraction completed successfully.');
}
