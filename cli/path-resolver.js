/**
 * Path Resolver for awesome-copilot CLI Installation
 * Fixes Issue #736: Broken file references after CLI installation
 */

const path = require('path');
const fs = require('fs');

/**
 * Resolves file references in plugin files
 * Converts relative paths to absolute paths based on plugin root
 *
 * @param {string} pluginRoot - Root directory of the plugin
 * @param {string} filePath - Path to resolve
 * @returns {string|null} Absolute path or null if not found
 */
function resolvePluginPaths(pluginRoot, filePath) {
  try {
    // Replace relative paths with absolute paths
    const absolutePath = path.resolve(pluginRoot, filePath);

    if (!fs.existsSync(absolutePath)) {
      console.error(`File not found: ${absolutePath}`);
      return null;
    }

    return absolutePath;
  } catch (error) {
    console.error(`Error resolving path: ${error.message}`);
    return null;
  }
}

/**
 * Validates YAML frontmatter in files
 *
 * @param {string} filePath - Path to file to validate
 * @returns {object} Validation result with status and details
 */
function validateYAMLFrontmatter(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        valid: false,
        error: `File not found: ${filePath}`
      };
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // Check for valid YAML frontmatter
    const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);

    if (!yamlMatch) {
      return {
        valid: false,
        error: 'Missing YAML frontmatter delimiters (---)',
        file: filePath
      };
    }

    const yamlContent = yamlMatch[1];

    // Check if YAML content is not empty
    if (!yamlContent.trim()) {
      return {
        valid: false,
        error: 'Empty YAML frontmatter',
        file: filePath
      };
    }

    // Basic YAML structure validation
    const lines = yamlContent.trim().split('\n');
    let hasKeyValue = false;

    for (const line of lines) {
      // Skip empty lines and comments
      if (!line.trim() || line.trim().startsWith('#')) {
        continue;
      }

      // Check for key: value structure
      if (line.includes(':')) {
        hasKeyValue = true;
        break;
      }
    }

    if (!hasKeyValue) {
      return {
        valid: false,
        error: 'YAML frontmatter missing key-value pairs',
        file: filePath
      };
    }

    return {
      valid: true,
      frontmatter: yamlContent,
      file: filePath
    };
  } catch (error) {
    return {
      valid: false,
      error: `YAML validation error: ${error.message}`,
      file: filePath
    };
  }
}

/**
 * Processes files and fixes relative path references
 *
 * @param {string} filePath - File to process
 * @param {string} pluginRoot - Plugin root directory
 * @returns {boolean} True if processing succeeded
 */
function processFile(filePath, pluginRoot) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    // Pattern 1: Fix C:\Users\LOQ\flight-agent-complete-final/ style paths
    if (content.includes('C:\Users\LOQ\flight-agent-complete-final/')) {
      content = content.replace(/\.\.\/\.\.\/\.\.\//g, path.resolve(pluginRoot, 'C:\Users\LOQ\flight-agent-complete-final\awesome-copilot/') + '/');
      modified = true;
    }

    // Pattern 2: Fix C:\Users\LOQ\flight-agent-complete-final\awesome-copilot/ style paths
    if (content.includes('C:\Users\LOQ\flight-agent-complete-final\awesome-copilot/')) {
      content = content.replace(/\.\.\/\.\.\//g, path.resolve(pluginRoot, '..') + '/');
      modified = true;
    }

    // Pattern 3: Fix cli/ style paths
    if (content.includes('cli/')) {
      content = content.replace(/\.\.\/(?!\.)/g, pluginRoot + '/');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✓ Fixed paths in: ${filePath}`);
    }

    return true;
  } catch (error) {
    console.error(`✗ Error processing file ${filePath}: ${error.message}`);
    return false;
  }
}

/**
 * Scans and fixes all files in a directory
 *
 * @param {string} sourceDir - Directory to scan
 * @param {string} pluginRoot - Plugin root directory
 * @returns {object} Report with results
 */
function fixPathsInDirectory(sourceDir, pluginRoot) {
  const report = {
    processed: 0,
    fixed: 0,
    errors: 0,
    details: []
  };

  try {
    const files = fs.readdirSync(sourceDir, { recursive: true });

    for (const file of files) {
      const fullPath = path.join(sourceDir, file);

      // Skip directories
      if (fs.statSync(fullPath).isDirectory()) {
        continue;
      }

      // Skip binary files
      if (['.png', '.jpg', '.gif', '.bin', '.exe'].some(ext => file.endsWith(ext))) {
        continue;
      }

      report.processed++;

      // Validate YAML if applicable
      if (file.endsWith('.md') || file.endsWith('.yml') || file.endsWith('.yaml')) {
        const validation = validateYAMLFrontmatter(fullPath);
        if (!validation.valid) {
          console.warn(`⚠ YAML issue in ${file}: ${validation.error}`);
        }
      }

      // Fix paths
      if (processFile(fullPath, pluginRoot)) {
        report.fixed++;
      } else {
        report.errors++;
      }
    }
  } catch (error) {
    console.error(`✗ Error scanning directory: ${error.message}`);
    report.errors++;
  }

  return report;
}

module.exports = {
  resolvePluginPaths,
  validateYAMLFrontmatter,
  processFile,
  fixPathsInDirectory
};

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: node path-resolver.js <plugin-directory>');
    process.exit(1);
  }

  const pluginDir = args[0];

  if (!fs.existsSync(pluginDir)) {
    console.error(`✗ Directory not found: ${pluginDir}`);
    process.exit(1);
  }

  console.log(`🔧 Fixing paths in: ${pluginDir}`);
  const report = fixPathsInDirectory(pluginDir, pluginDir);

  console.log(`\n✓ Processing complete:`);
  console.log(`  - Files processed: ${report.processed}`);
  console.log(`  - Files fixed: ${report.fixed}`);
  console.log(`  - Errors: ${report.errors}`);

  if (report.errors > 0) {
    process.exit(1);
  }
}
