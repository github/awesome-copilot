#!/usr/bin/env node

/**
 * Deduplication Script for awesome-copilot
 * Fixes Issue #1572: Remove duplicate resources
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Creates hash of file content
 * @param {string} content - File content
 * @returns {string} SHA256 hash
 */
function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Finds duplicate resources in directory
 * @param {string} resourcesDir - Directory to scan
 * @returns {object} Map of duplicates
 */
function findDuplicates(resourcesDir) {
  const resourceMap = new Map();
  const duplicates = [];
  const fileStats = {
    total: 0,
    scanned: 0,
    duplicates: 0,
  };

  try {
    const files = fs.readdirSync(resourcesDir, { recursive: true });

    for (const file of files) {
      fileStats.total++;

      const filePath = path.join(resourcesDir, file);

      // Skip directories
      try {
        if (fs.statSync(filePath).isDirectory()) {
          continue;
        }
      } catch (error) {
        console.warn(`⚠ Warning: Cannot stat ${filePath}`);
        continue;
      }

      // Skip non-relevant files
      const ext = path.extname(file).toLowerCase();
      if (!['.json', '.yaml', '.yml', '.md'].includes(ext)) {
        continue;
      }

      fileStats.scanned++;

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const hash = hashContent(content);

        if (resourceMap.has(hash)) {
          // This is a duplicate
          const originalFile = resourceMap.get(hash);
          duplicates.push({
            original: originalFile,
            duplicate: file,
            hash: hash,
            size: content.length,
          });
          fileStats.duplicates++;
        } else {
          // First time seeing this content
          resourceMap.set(hash, file);
        }
      } catch (error) {
        console.warn(`⚠ Warning: Cannot read ${file} - ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`✗ Error scanning directory: ${error.message}`);
  }

  return {
    duplicates,
    fileStats,
    totalUnique: resourceMap.size,
  };
}

/**
 * Safely removes duplicate files
 * @param {string} resourcesDir - Root directory
 * @param {array} duplicates - List of duplicates to remove
 * @param {boolean} dryRun - Just preview, don't actually delete
 * @returns {object} Report of removals
 */
function removeDuplicates(resourcesDir, duplicates, dryRun = true) {
  const report = {
    removed: [],
    failed: [],
    backups: [],
  };

  console.log(`\n${dryRun ? '📋 DRY RUN' : '🗑️  REMOVING'} ${duplicates.length} duplicate files\n`);

  for (const dup of duplicates) {
    try {
      const filePath = path.join(resourcesDir, dup.duplicate);

      if (!fs.existsSync(filePath)) {
        console.warn(`⚠ File not found: ${dup.duplicate}`);
        report.failed.push({
          file: dup.duplicate,
          reason: 'File not found',
        });
        continue;
      }

      if (dryRun) {
        console.log(`[DRY RUN] Would delete: ${dup.duplicate}`);
        console.log(`          (duplicate of: ${dup.original})`);
        console.log(`          (size: ${dup.size} bytes)\n`);
      } else {
        // Create backup
        const backupPath = filePath + '.backup';
        fs.copyFileSync(filePath, backupPath);
        report.backups.push(backupPath);

        // Remove original
        fs.unlinkSync(filePath);

        console.log(`✓ Deleted: ${dup.duplicate}`);
        console.log(`  └─ Kept as original: ${dup.original}`);
        console.log(`  └─ Backup saved: ${backupPath}\n`);

        report.removed.push({
          file: dup.duplicate,
          originalFile: dup.original,
          backup: backupPath,
        });
      }
    } catch (error) {
      console.error(`✗ Error processing ${dup.duplicate}: ${error.message}`);
      report.failed.push({
        file: dup.duplicate,
        reason: error.message,
      });
    }
  }

  return report;
}

/**
 * Generates detailed report
 * @param {string} resourcesDir - Directory scanned
 * @param {object} findings - Duplicate findings
 * @param {object} report - Removal report
 * @returns {object} Summary report
 */
function generateReport(resourcesDir, findings, report) {
  const summary = {
    timestamp: new Date().toISOString(),
    directory: resourcesDir,
    statistics: {
      total_files: findings.fileStats.total,
      scanned_files: findings.fileStats.scanned,
      unique_files: findings.totalUnique,
      duplicate_files: findings.fileStats.duplicates,
      duplicate_groups: findings.duplicates.length,
    },
    action: {
      removed: report.removed.length,
      failed: report.failed.length,
      backups_created: report.backups.length,
    },
    details: {
      removed_files: report.removed,
      failed_files: report.failed,
      backup_files: report.backups,
    },
  };

  return summary;
}

/**
 * Saves report to JSON file
 * @param {object} report - Report to save
 * @param {string} outputPath - Path to save report
 */
function saveReport(report, outputPath) {
  try {
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n✓ Report saved to: ${outputPath}`);
  } catch (error) {
    console.error(`✗ Failed to save report: ${error.message}`);
  }
}

/**
 * Main deduplication function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log(`
Usage: node deduplicate-resources.js <directory> [--remove] [--output <file>]

Options:
  --remove              Actually remove duplicates (default: dry-run)
  --output <file>       Save report to JSON file
  --help                Show this help message

Examples:
  # Dry run (preview what would be deleted)
  node deduplicate-resources.js ./resources

  # Actually remove duplicates
  node deduplicate-resources.js ./resources --remove

  # Save report
  node deduplicate-resources.js ./resources --remove --output report.json
    `);
    process.exit(0);
  }

  const resourcesDir = args[0];
  const shouldRemove = args.includes('--remove');
  const outputIndex = args.indexOf('--output');
  const outputPath =
    outputIndex !== -1 && outputIndex + 1 < args.length ? args[outputIndex + 1] : null;

  // Validate directory
  if (!fs.existsSync(resourcesDir)) {
    console.error(`✗ Directory not found: ${resourcesDir}`);
    process.exit(1);
  }

  if (!fs.statSync(resourcesDir).isDirectory()) {
    console.error(`✗ Not a directory: ${resourcesDir}`);
    process.exit(1);
  }

  console.log(`🔍 Scanning for duplicate resources in: ${resourcesDir}\n`);

  // Find duplicates
  const findings = findDuplicates(resourcesDir);

  // Report findings
  console.log(`📊 Scan Results:`);
  console.log(`   Total files: ${findings.fileStats.total}`);
  console.log(`   Scanned: ${findings.fileStats.scanned}`);
  console.log(`   Unique: ${findings.totalUnique}`);
  console.log(`   Duplicates: ${findings.fileStats.duplicates}\n`);

  if (findings.fileStats.duplicates === 0) {
    console.log('✓ No duplicates found!');
    process.exit(0);
  }

  // Preview removals
  const report = removeDuplicates(resourcesDir, findings.duplicates, !shouldRemove);

  // Generate summary
  const summary = generateReport(resourcesDir, findings, report);

  // Print summary
  console.log(`\n📋 Summary:`);
  console.log(`   Files to remove: ${report.removed.length}`);
  console.log(`   Failed: ${report.failed.length}`);
  console.log(`   Space saved: ${findings.duplicates.reduce((sum, d) => sum + d.size, 0)} bytes`);

  if (report.failed.length > 0) {
    console.log(`\n❌ Failed files:`);
    report.failed.forEach((item) => {
      console.log(`   - ${item.file}: ${item.reason}`);
    });
  }

  // Save report if requested
  if (outputPath) {
    saveReport(summary, outputPath);
  }

  if (!shouldRemove) {
    console.log(
      `\n💡 This was a dry run. Use --remove flag to actually delete files.`
    );
  } else {
    console.log(`\n✓ Deduplication complete!`);
  }
}

// Run main function
if (require.main === module) {
  main();
}

module.exports = {
  hashContent,
  findDuplicates,
  removeDuplicates,
  generateReport,
  saveReport,
};
