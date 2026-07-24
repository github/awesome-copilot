#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { parseFrontmatter } from "./yaml-parser.mjs";
import { AGENTS_DIR } from "./constants.mjs";

const AGENT_FILENAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\.agent\.md$/;
const AGENT_DESCRIPTION_MIN_LENGTH = 10;
const AGENT_DESCRIPTION_MAX_LENGTH = 1024;

// Validation functions
function validateAgentDescription(description) {
  if (
    !description ||
    typeof description !== "string" ||
    description.trim().length === 0
  ) {
    return ["description is required and must be a non-empty string"];
  }

  const errors = [];
  if (description.length < AGENT_DESCRIPTION_MIN_LENGTH) {
    errors.push(
      `description must be at least ${AGENT_DESCRIPTION_MIN_LENGTH} characters`
    );
  }
  if (description.length > AGENT_DESCRIPTION_MAX_LENGTH) {
    errors.push(
      `description must not exceed ${AGENT_DESCRIPTION_MAX_LENGTH} characters`
    );
  }
  return errors;
}

function validateAgentFile(filePath) {
  const errors = [];
  const warnings = [];
  const fileName = path.basename(filePath);

  if (!fs.existsSync(filePath)) {
    errors.push("File not found");
    return { errors, warnings };
  }

  if (!fileName.endsWith(".agent.md")) {
    errors.push('File name must end with ".agent.md"');
  } else if (!AGENT_FILENAME_PATTERN.test(fileName)) {
    warnings.push(
      'File name should be lower case with words separated by hyphens (e.g. "my-agent.agent.md")'
    );
  }

  const frontmatter = parseFrontmatter(filePath);
  if (!frontmatter) {
    errors.push("Missing or unparsable YAML front matter");
    return { errors, warnings };
  }

  errors.push(...validateAgentDescription(frontmatter.description));

  if (
    !frontmatter.name ||
    typeof frontmatter.name !== "string" ||
    frontmatter.name.trim().length === 0
  ) {
    warnings.push(
      'name field is recommended (a human-readable title, e.g. "Address Comments")'
    );
  }

  if (frontmatter.model === undefined || frontmatter.model === null) {
    warnings.push("model field is strongly recommended");
  }

  if (frontmatter.tools === undefined) {
    warnings.push("tools field is recommended");
  } else if (!Array.isArray(frontmatter.tools)) {
    errors.push("tools must be an array when present");
  }

  return { errors, warnings };
}

function discoverAgentFiles() {
  if (!fs.existsSync(AGENTS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(AGENTS_DIR)
    .filter((file) => file.endsWith(".agent.md"))
    .map((file) => path.join(AGENTS_DIR, file));
}

// Main validation function
function validateAgents(files) {
  if (files.length === 0) {
    console.log("No agent files found - validation skipped");
    return true;
  }

  console.log(`Validating ${files.length} agent file(s)...`);

  let hasErrors = false;

  for (const filePath of files) {
    const relPath = path.relative(process.cwd(), filePath);
    const { errors, warnings } = validateAgentFile(filePath);

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
    console.log(`\n✅ All ${files.length} agent file(s) passed validation`);
  }

  return !hasErrors;
}

// Run validation
try {
  const cliArgs = process.argv.slice(2);
  const files =
    cliArgs.length > 0
      ? cliArgs.map((file) => path.resolve(file))
      : discoverAgentFiles();

  const isValid = validateAgents(files);
  if (!isValid) {
    console.error("\n❌ Agent validation failed");
    process.exit(1);
  }
  console.log("\n🎉 Agent validation passed");
} catch (error) {
  console.error(`Error during validation: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}
