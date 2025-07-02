#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function standardizeFrontmatter(content) {
  const lines = content.split('\n');
  const result = [];
  let inFrontmatter = false;
  let frontmatterEnded = false;

  for (const line of lines) {
    if (line.trim() === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true;
        result.push(line);
      } else if (!frontmatterEnded) {
        frontmatterEnded = true;
        result.push(line);
      } else {
        result.push(line);
      }
      continue;
    }

    if (inFrontmatter && !frontmatterEnded) {
      // Convert frontmatter fields to use single quotes
      let modifiedLine = line;
      
      // Handle fields that should use single quotes for strings
      const fieldsToStandardize = ['mode', 'description', 'applyTo', 'title'];
      
      for (const field of fieldsToStandardize) {
        // Pattern 1: Convert double quotes to single quotes
        const doubleQuotePattern = new RegExp(`^(${field}:\\s*)"([^"]*)"(\\s*)$`);
        const doubleQuoteMatch = modifiedLine.match(doubleQuotePattern);
        if (doubleQuoteMatch) {
          modifiedLine = `${doubleQuoteMatch[1]}'${doubleQuoteMatch[2]}'${doubleQuoteMatch[3]}`;
          continue; // Skip to next field if we found a match
        }
        
        // Pattern 2: Fix double single quotes (''text'') to single quotes
        const doubleSingleQuotePattern = new RegExp(`^(${field}:\\s*)''([^']*?)''(\\s*)$`);
        const doubleSingleQuoteMatch = modifiedLine.match(doubleSingleQuotePattern);
        if (doubleSingleQuoteMatch) {
          modifiedLine = `${doubleSingleQuoteMatch[1]}'${doubleSingleQuoteMatch[2]}'${doubleSingleQuoteMatch[3]}`;
          continue;
        }
        
        // Pattern 3: Fix missing space after colon (field:value -> field: value)
        const noSpacePattern = new RegExp(`^(${field}:)([^\\s])`);
        const noSpaceMatch = modifiedLine.match(noSpacePattern);
        if (noSpaceMatch) {
          modifiedLine = modifiedLine.replace(noSpacePattern, `${noSpaceMatch[1]} ${noSpaceMatch[2]}`);
        }
        
        // Pattern 4: Add single quotes to unquoted values (but not arrays or objects)
        const unquotedPattern = new RegExp(`^(${field}:\\s*)([^'\"\\[\\{][^\\n]*?)(\\s*)$`);
        const unquotedMatch = modifiedLine.match(unquotedPattern);
        if (unquotedMatch) {
          const value = unquotedMatch[2].trim();
          // Only quote if it's not already quoted and not empty
          if (value && !value.startsWith('[') && !value.startsWith('{')) {
            modifiedLine = `${unquotedMatch[1]}'${value}'${unquotedMatch[3]}`;
          }
        }
      }
      
      // Handle tools array - convert double quotes to single quotes within the array
      if (modifiedLine.includes('tools:')) {
        modifiedLine = modifiedLine.replace(/"/g, "'");
      }
      
      result.push(modifiedLine);
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}

function processFiles() {
  const directories = ['prompts', 'instructions', 'chatmodes'];
  let filesProcessed = 0;

  for (const dir of directories) {
    const dirPath = path.join(__dirname, dir);
    
    if (!fs.existsSync(dirPath)) {
      console.log(`Directory ${dir} does not exist, skipping...`);
      continue;
    }

    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = path.join(dirPath, file);
        
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const standardizedContent = standardizeFrontmatter(content);
          
          // Only write if content has changed
          if (content !== standardizedContent) {
            fs.writeFileSync(filePath, standardizedContent);
            console.log(`Standardized frontmatter in: ${filePath}`);
            filesProcessed++;
          }
        } catch (error) {
          console.error(`Error processing ${filePath}: ${error.message}`);
        }
      }
    }
  }
  
  console.log(`\nProcessed ${filesProcessed} files.`);
}

processFiles();
