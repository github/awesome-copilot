import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const statuses = new Set(['verified', 'partial', 'blocked'])
const evidenceSources = new Set(['executed-now', 'supplied', 'mixed'])
const baselineResults = new Set(['failed', 'observed', 'not-run'])
const verificationResults = new Set(['passed', 'failed', 'not-run'])

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0

export const sampleReceipt = {
  version: 2,
  status: 'verified',
  evidenceSource: 'executed-now',
  problem: 'A 10% checkout discount returns 100 instead of 90 after currency rounding.',
  baseline: {
    command: 'npm test -- discount.test.ts',
    result: 'failed',
    evidence: 'Expected 90, received 100.',
  },
  rootCause: {
    summary: 'The subtotal was rounded before the percentage discount was applied.',
    evidence: [{ location: 'src/pricing.ts:42', observation: 'roundCurrency(subtotal) was passed into applyDiscount().' }],
  },
  changes: [{ file: 'src/pricing.ts', summary: 'Apply the discount to the subtotal before currency rounding.' }],
  verification: [
    { command: 'npm test -- discount.test.ts', result: 'passed', evidence: '1 test passed.' },
    { command: 'npm test', result: 'passed', evidence: '42 tests passed.' },
  ],
  gaps: [],
}

export function validateReceipt(receipt) {
  const issues = []
  const add = (path, message) => issues.push({ path, message })
  const rejectUnknown = (value, allowed, path) => {
    if (!isObject(value)) return
    for (const key of Object.keys(value)) {
      if (!allowed.has(key)) add(path ? `${path}.${key}` : key, 'Unknown field.')
    }
  }

  if (!isObject(receipt)) return { valid: false, issues: [{ path: '$', message: 'Receipt must be a JSON object.' }] }
  rejectUnknown(receipt, new Set(['version', 'status', 'evidenceSource', 'problem', 'baseline', 'rootCause', 'changes', 'verification', 'gaps']), '')

  if (receipt.version !== 1 && receipt.version !== 2) add('version', 'Must equal 1 or 2.')
  if (!statuses.has(receipt.status)) add('status', 'Must be verified, partial, or blocked.')
  if (receipt.evidenceSource !== undefined && !evidenceSources.has(receipt.evidenceSource)) add('evidenceSource', 'Must be executed-now, supplied, or mixed.')
  if (receipt.version === 2 && !evidenceSources.has(receipt.evidenceSource)) add('evidenceSource', 'Version 2 requires an evidence source.')
  if (!nonEmpty(receipt.problem)) add('problem', 'Must be a non-empty string.')

  if (!isObject(receipt.baseline)) {
    add('baseline', 'Must be an object.')
  } else {
    rejectUnknown(receipt.baseline, new Set(['command', 'result', 'evidence']), 'baseline')
    if (!nonEmpty(receipt.baseline.command)) add('baseline.command', 'Must be a non-empty string.')
    if (!baselineResults.has(receipt.baseline.result)) add('baseline.result', 'Must be failed, observed, or not-run.')
    if (!nonEmpty(receipt.baseline.evidence)) add('baseline.evidence', 'Must be a non-empty string.')
  }

  if (!isObject(receipt.rootCause)) {
    add('rootCause', 'Must be an object.')
  } else {
    rejectUnknown(receipt.rootCause, new Set(['summary', 'evidence']), 'rootCause')
    if (!nonEmpty(receipt.rootCause.summary)) add('rootCause.summary', 'Must be a non-empty string.')
    if (!Array.isArray(receipt.rootCause.evidence)) {
      add('rootCause.evidence', 'Must be an array.')
    } else {
      receipt.rootCause.evidence.forEach((entry, index) => {
        if (!isObject(entry)) return add(`rootCause.evidence[${index}]`, 'Must be an object.')
        rejectUnknown(entry, new Set(['location', 'observation']), `rootCause.evidence[${index}]`)
        if (!nonEmpty(entry.location)) add(`rootCause.evidence[${index}].location`, 'Must be a non-empty string.')
        if (!nonEmpty(entry.observation)) add(`rootCause.evidence[${index}].observation`, 'Must be a non-empty string.')
      })
    }
  }

  if (!Array.isArray(receipt.changes)) {
    add('changes', 'Must be an array.')
  } else {
    receipt.changes.forEach((entry, index) => {
      if (!isObject(entry)) return add(`changes[${index}]`, 'Must be an object.')
      rejectUnknown(entry, new Set(['file', 'summary']), `changes[${index}]`)
      if (!nonEmpty(entry.file)) add(`changes[${index}].file`, 'Must be a non-empty string.')
      if (!nonEmpty(entry.summary)) add(`changes[${index}].summary`, 'Must be a non-empty string.')
    })
  }

  if (!Array.isArray(receipt.verification)) {
    add('verification', 'Must be an array.')
  } else {
    receipt.verification.forEach((entry, index) => {
      if (!isObject(entry)) return add(`verification[${index}]`, 'Must be an object.')
      rejectUnknown(entry, new Set(['command', 'result', 'evidence']), `verification[${index}]`)
      if (!nonEmpty(entry.command)) add(`verification[${index}].command`, 'Must be a non-empty string.')
      if (!verificationResults.has(entry.result)) add(`verification[${index}].result`, 'Must be passed, failed, or not-run.')
      if (!nonEmpty(entry.evidence)) add(`verification[${index}].evidence`, 'Must be a non-empty string.')
    })
  }

  if (!Array.isArray(receipt.gaps) || receipt.gaps.some((gap) => !nonEmpty(gap))) add('gaps', 'Must be an array of non-empty strings.')

  if (receipt.status === 'verified') {
    if (receipt.baseline?.result === 'not-run') add('baseline.result', 'Verified requires an observed baseline.')
    if (!Array.isArray(receipt.rootCause?.evidence) || receipt.rootCause.evidence.length === 0) add('rootCause.evidence', 'Verified requires concrete root-cause evidence.')
    if (!Array.isArray(receipt.changes) || receipt.changes.length === 0) add('changes', 'Verified requires at least one changed file or artifact.')
    if (!Array.isArray(receipt.verification) || receipt.verification.length === 0) add('verification', 'Verified requires at least one verification check.')
    if (Array.isArray(receipt.verification) && receipt.verification.some((entry) => entry?.result !== 'passed')) add('verification', 'Every verification check must pass for verified status.')
    if (Array.isArray(receipt.gaps) && receipt.gaps.length > 0) add('gaps', 'Verified status cannot contain proof gaps.')
  }

  if (receipt.status === 'partial' && Array.isArray(receipt.gaps) && receipt.gaps.length === 0) add('gaps', 'Partial status must name at least one missing proof layer.')
  if (receipt.status === 'blocked' && Array.isArray(receipt.gaps) && receipt.gaps.length === 0) add('gaps', 'Blocked status must name the external blocking condition.')

  return { valid: issues.length === 0, issues }
}

async function main() {
  const path = process.argv[2]
  if (!path) throw new Error('Usage: node scripts/validate-receipt.mjs <receipt.json> [--json]')

  let input = ''
  if (path === '-') {
    process.stdin.setEncoding('utf8')
    for await (const chunk of process.stdin) input += chunk
  } else {
    input = await readFile(resolve(path), 'utf8')
  }
  const receipt = JSON.parse(input)
  const result = validateReceipt(receipt)

  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(result)}\n`)
  } else if (result.valid) {
    process.stdout.write(`✓ ${path} is a valid ${receipt.status.toUpperCase()} bug receipt.\n`)
  } else {
    process.stderr.write(`✗ ${path} is not a valid bug receipt:\n`)
    for (const issue of result.issues) process.stderr.write(`  ${issue.path}: ${issue.message}\n`)
  }

  process.exitCode = result.valid ? 0 : 1
}

const invokedUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : ''
if (import.meta.url === invokedUrl) {
  main().catch((error) => {
    process.stderr.write(`bug-receipt: ${error.message}\n`)
    process.exitCode = 2
  })
}
