#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { parseFrontmatter } from "./yaml-parser.mjs";
import { INSTRUCTIONS_DIR } from "./constants.mjs";

const INSTRUCTION_FILENAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\.instructions\.md$/;
const INSTRUCTION_DESCRIPTION_MIN_LENGTH = 10;
const INSTRUCTION_DESCRIPTION_MAX_LENGTH = 1024;

// Validation functions
function validateInstructionDescription(description) {
  if (
    !description ||
    typeof description !== "string" ||
    description.trim().length === 0
  ) {
    return ["description is required and must be a non-empty string"];
  }

  const errors = [];
  if (description.length < INSTRUCTION_DESCRIPTION_MIN_LENGTH) {
    errors.push(
      `description must be at least ${INSTRUCTION_DESCRIPTION_MIN_LENGTH} characters`
    );
  }
  if (description.length > INSTRUCTION_DESCRIPTION_MAX_LENGTH) {
    errors.push(
      `description must not exceed ${INSTRUCTION_DESCRIPTION_MAX_LENGTH} characters`
    );
  }
  return errors;
}

function validateApplyTo(applyTo) {
  if (applyTo === undefined || applyTo === null) {
    return ["applyTo is required and must specify one or more file glob patterns"];
  }

  const patterns = Array.isArray(applyTo) ? applyTo : String(applyTo).split(",");

  if (Array.isArray(applyTo) && applyTo.length === 0) {
    return ["applyTo must not be an empty array"];
  }

  const errors = [];
  for (const pattern of patterns) {
    if (typeof pattern !== "string" || pattern.trim().length === 0) {
      errors.push("applyTo patterns must be non-empty strings");
      break;
    }
  }
  return errors;
}

function validateInstructionFile(filePath) {
  const errors = [];
  const warnings = [];
  const fileName = path.basename(filePath);

  if (!fs.existsSync(filePath)) {
    errors.push("File not found");
    return { errors, warnings };
  }

  if (!fileName.endsWith(".instructions.md")) {
    errors.push('File name must end with ".instructions.md"');
  } else if (!INSTRUCTION_FILENAME_PATTERN.test(fileName)) {
    warnings.push(
      'File name should be lower case with words separated by hyphens (e.g. "my-rules.instructions.md")'
    );
  }

  const frontmatter = parseFrontmatter(filePath);
  if (!frontmatter) {
    errors.push("Missing or unparsable YAML front matter");
    return { errors, warnings };
  }

  errors.push(...validateInstructionDescription(frontmatter.description));
  errors.push(...validateApplyTo(frontmatter.applyTo));

  return { errors, warnings };
}

function discoverInstructionFiles() {
  if (!fs.existsSync(INSTRUCTIONS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(INSTRUCTIONS_DIR)
    .filter((file) => file.endsWith(".instructions.md"))
    .map((file) => path.join(INSTRUCTIONS_DIR, file));
}

// Main validation function
function validateInstructions(files) {
  if (files.length === 0) {
    console.log("No instruction files found - validation skipped");
    return true;
  }

  console.log(`Validating ${files.length} instruction file(s)...`);

  let hasErrors = false;

  for (const filePath of files) {
    const relPath = path.relative(process.cwd(), filePath);
    const { errors, warnings } = validateInstructionFile(filePath);

    if (errors.length > 0) {
      console.error(`\n❌ ${relPath}:`);
      errors.forEach((error) => console.error(`   - ${error}`));
      hasErrors = true;
    } else {
      console.log(`✅ ${relPath}`);
    }

    warnings.forEach((warning) =>
      console.warn(`   ⚠️  ${relPath}: ${warning}`)
    );
  }

  if (!hasErrors) {
    console.log(
      `\n✅ All ${files.length} instruction file(s) passed validation`
    );
  }

  return !hasErrors;
}

// Run validation
try {
  const cliArgs = process.argv.slice(2);
  const files =
    cliArgs.length > 0
      ? cliArgs.map((file) => path.resolve(file))
      : discoverInstructionFiles();

  const isValid = validateInstructions(files);
  if (!isValid) {
    console.error("\n❌ Instruction validation failed");
    process.exit(1);
  }
  console.log("\n🎉 Instruction validation passed");
} catch (error) {
  console.error(`Error during validation: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}
