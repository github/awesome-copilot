// Simple YAML parser for collection files
const fs = require("fs");

function safeFileOperation(operation, filePath, defaultValue = null) {
  try {
    return operation();
  } catch (error) {
    console.error(`Error processing file ${filePath}: ${error.message}`);
    return defaultValue;
  }
}

function parseCollectionYaml(filePath) {
  return safeFileOperation(
    () => {
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");
      const result = {};
      let currentKey = null;
      let currentArray = null;
      let currentObject = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        if (!trimmed || trimmed.startsWith("#")) continue;

        const leadingSpaces = line.length - line.trimLeft().length;
        
        // Handle array items starting with -
        if (trimmed.startsWith("- ")) {
          if (currentKey === "items") {
            if (!currentArray) {
              currentArray = [];
              result[currentKey] = currentArray;
            }
            
            // Parse item object
            const item = {};
            currentArray.push(item);
            currentObject = item;
            
            // Handle inline properties on same line as -
            const restOfLine = trimmed.substring(2).trim();
            if (restOfLine) {
              const colonIndex = restOfLine.indexOf(":");
              if (colonIndex > -1) {
                const key = restOfLine.substring(0, colonIndex).trim();
                const value = restOfLine.substring(colonIndex + 1).trim();
                item[key] = value;
              }
            }
          } else if (currentKey === "tags") {
            if (!currentArray) {
              currentArray = [];
              result[currentKey] = currentArray;
            }
            const value = trimmed.substring(2).trim();
            currentArray.push(value);
          }
        }
        // Handle key-value pairs
        else if (trimmed.includes(":")) {
          const colonIndex = trimmed.indexOf(":");
          const key = trimmed.substring(0, colonIndex).trim();
          let value = trimmed.substring(colonIndex + 1).trim();
          
          if (leadingSpaces === 0) {
            // Top-level property
            currentKey = key;
            currentArray = null;
            currentObject = null;
            
            if (value) {
              // Handle array format [item1, item2, item3]
              if (value.startsWith("[") && value.endsWith("]")) {
                const arrayContent = value.slice(1, -1);
                if (arrayContent.trim()) {
                  result[key] = arrayContent.split(",").map(item => item.trim());
                } else {
                  result[key] = [];
                }
                currentKey = null; // Reset since we handled the array
              } else {
                result[key] = value;
              }
            } else if (key === "items" || key === "tags") {
              // Will be populated by array items
              result[key] = [];
              currentArray = result[key];
            } else if (key === "display") {
              result[key] = {};
              currentObject = result[key];
            }
          } else if (currentObject && leadingSpaces > 0) {
            // Property of current object (e.g., display properties)
            currentObject[key] = value === "true" ? true : value === "false" ? false : value;
          } else if (currentArray && currentObject && leadingSpaces > 2) {
            // Property of array item object
            currentObject[key] = value;
          }
        }
      }
      
      return result;
    },
    filePath,
    null
  );
}

module.exports = { parseCollectionYaml, safeFileOperation };