#!/usr/bin/env node

import fs from "fs";
import path from "path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

function parseArgs(argv) {
  const args = { schema: null, data: null };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--schema") {
      args.schema = argv[i + 1] || null;
      i += 1;
    } else if (arg === "--data") {
      args.data = argv[i + 1] || null;
      i += 1;
    }
  }
  return args;
}

function readJson(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  return JSON.parse(content);
}

const args = parseArgs(process.argv);
if (!args.schema) {
  console.error("Missing required argument: --schema <path>");
  process.exit(1);
}

const schemaPath = path.resolve(process.cwd(), args.schema);
let schema;
try {
  schema = readJson(schemaPath);
} catch (error) {
  console.error(`Invalid schema JSON at ${args.schema}: ${error.message}`);
  process.exit(1);
}

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

let validate;
try {
  validate = ajv.compile(schema);
} catch (error) {
  console.error(`Invalid schema at ${args.schema}: ${error.message}`);
  process.exit(1);
}

if (!args.data) {
  console.log(`Schema is valid: ${args.schema}`);
  process.exit(0);
}

const dataPath = path.resolve(process.cwd(), args.data);
let data;
try {
  data = readJson(dataPath);
} catch (error) {
  console.error(`Invalid data JSON at ${args.data}: ${error.message}`);
  process.exit(1);
}

const valid = validate(data);
if (!valid) {
  const message = ajv.errorsText(validate.errors, { separator: "; " });
  console.error(`Schema validation failed for ${args.data}: ${message}`);
  process.exit(1);
}

console.log(`Schema validation passed: ${args.data}`);