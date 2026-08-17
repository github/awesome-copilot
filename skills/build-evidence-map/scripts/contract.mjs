export const NODE_TYPES = new Set(["position", "claim", "evidence", "unknown"]);
export const RELATIONS = new Set(["supports", "contradicts", "qualifies", "missing"]);

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_UTC_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?Z$/;
const LOCATOR_PATTERNS = [
  /\bp(?:age)?\.?\s*\d+(?:\s*[-–]\s*\d+)?\b/i,
  /§\s*[\p{L}\p{N}][\p{L}\p{N}._-]*/u,
  /\bL\d+(?:\s*[-–]\s*L?\d+)?\b/i,
  /\blines?\s+\d+(?:\s*[-–]\s*\d+)?\b/i,
  /\b(?:\d{1,2}:)?\d{2}:\d{2}(?:\s*[-–]\s*(?:\d{1,2}:)?\d{2}:\d{2})?\b/,
  /^(?:section|chapter|heading)\s*(?::|§)\s*\S.{1,}$/i,
];

export class MapValidationError extends Error {
  constructor(findings) {
    super(`Evidence map is invalid (${findings.length} ${findings.length === 1 ? "finding" : "findings"}).`);
    this.name = "MapValidationError";
    this.findings = findings;
  }
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonical(value[key])]),
  );
}

export function canonicalJson(map) {
  return JSON.stringify(canonical(map));
}

export function receiptPayload(map, sourceSnapshots) {
  return {
    contract: "doubt-evidence-receipt-v1",
    map,
    sourceSnapshots,
  };
}

function finding(path, rule, message) {
  return { path, rule, message };
}

function parseIsoDate(value) {
  if (typeof value !== "string") return null;
  const match = value.match(ISO_DATE);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const time = Date.UTC(year, month - 1, day);
  const date = new Date(time);
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return null;
  return time;
}

function retrievalDate(value) {
  const date = parseIsoDate(value);
  if (date !== null) return date;
  if (typeof value !== "string") return null;
  const match = value.match(ISO_UTC_TIMESTAMP);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  if (hour > 23 || minute > 59 || second > 59) return null;
  const dayValue = parseIsoDate(
    `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  );
  return dayValue === null ? null : dayValue;
}

function validUtcTimestamp(value) {
  if (typeof value !== "string") return false;
  const match = value.match(ISO_UTC_TIMESTAMP);
  if (!match) return false;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  if (hour > 23 || minute > 59 || second > 59) return false;
  return parseIsoDate(
    `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  ) !== null;
}

function boundedLocator(value) {
  return typeof value === "string" && LOCATOR_PATTERNS.some((pattern) => pattern.test(value.trim()));
}

function sourceLocation(value) {
  return typeof value === "string" && /^(?:https?:\/\/|file:\/\/|\.\.?[\\/]|[\\/]|[A-Za-z]:[\\/])/.test(value);
}

function substantiveExcerpt(value) {
  if (typeof value !== "string") return false;
  const symbols = value.toLowerCase().match(/[\p{L}\p{N}]/gu) || [];
  return new Set(symbols).size >= 6;
}

function reaches(start, target, adjacency, seen = new Set()) {
  if (start === target) return true;
  if (seen.has(start)) return false;
  seen.add(start);
  return (adjacency.get(start) || []).some((next) => reaches(next, target, adjacency, seen));
}

export function inspectMapContract(map) {
  const findings = [];
  if (!map || typeof map !== "object" || Array.isArray(map)) {
    return {
      findings: [finding("$", "map-type", "The map must be a JSON object.")],
      metrics: { claims: 0, contradictions: 0, evidence: 0, sources: 0, unknowns: 0 },
      receipt: null,
      valid: false,
    };
  }

  for (const key of ["title", "question", "verdict", "updatedAt"]) {
    if (!map[key] || typeof map[key] !== "string") {
      findings.push(finding(`$.${key}`, "required-field", `${key} must be a non-empty string.`));
    }
  }
  const updatedAt = parseIsoDate(map.updatedAt);
  if (typeof map.updatedAt === "string" && updatedAt === null) {
    findings.push(
      finding("$.updatedAt", "map-date", "updatedAt must be a real calendar date in YYYY-MM-DD format."),
    );
  }
  if (!Array.isArray(map.nodes) || map.nodes.length === 0) {
    findings.push(finding("$.nodes", "required-nodes", "nodes must be a non-empty array."));
  }
  if (!Array.isArray(map.edges)) {
    findings.push(finding("$.edges", "required-edges", "edges must be an array."));
  }
  if (!Array.isArray(map.sources)) {
    findings.push(finding("$.sources", "required-sources", "sources must be an array."));
  }

  const nodes = Array.isArray(map.nodes) ? map.nodes : [];
  const edges = Array.isArray(map.edges) ? map.edges : [];
  const sources = Array.isArray(map.sources) ? map.sources : [];
  const nodeIds = new Set();
  const sourceIds = new Set();

  for (const [index, node] of nodes.entries()) {
    const base = `$.nodes[${index}]`;
    if (!node || typeof node !== "object" || Array.isArray(node)) {
      findings.push(finding(base, "node-type", "Each node must be an object."));
      continue;
    }
    if (!node.id || typeof node.id !== "string") {
      findings.push(finding(`${base}.id`, "node-id", "Each node needs a string id."));
    } else if (nodeIds.has(node.id)) {
      findings.push(finding(`${base}.id`, "duplicate-node", `Duplicate node id: ${node.id}.`));
    } else {
      nodeIds.add(node.id);
    }
    if (!NODE_TYPES.has(node.type)) {
      findings.push(
        finding(
          `${base}.type`,
          "node-type",
          `Node type must be one of: ${[...NODE_TYPES].join(", ")}.`,
        ),
      );
    }
    for (const key of ["label", "text"]) {
      if (!node[key] || typeof node[key] !== "string") {
        findings.push(finding(`${base}.${key}`, "node-copy", `${key} must be a non-empty string.`));
      }
    }
    if (node.confidence != null) {
      findings.push(
        finding(
          `${base}.confidence`,
          "false-precision",
          "Confidence percentages are not supported; use an unknown or a qualified claim instead.",
        ),
      );
    }
  }

  for (const [index, source] of sources.entries()) {
    const base = `$.sources[${index}]`;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      findings.push(finding(base, "source-type", "Each source must be an object."));
      continue;
    }
    if (!source.id || typeof source.id !== "string") {
      findings.push(finding(`${base}.id`, "source-id", "Each source needs a string id."));
    } else if (sourceIds.has(source.id)) {
      findings.push(finding(`${base}.id`, "duplicate-source", `Duplicate source id: ${source.id}.`));
    } else {
      sourceIds.add(source.id);
    }
    for (const key of ["title", "publisher", "date", "retrievedAt", "url", "locator", "excerpt"]) {
      if (!source[key] || typeof source[key] !== "string") {
        findings.push(
          finding(`${base}.${key}`, "source-field", `${key} must be a non-empty string.`),
        );
      }
    }
    const sourceDate = parseIsoDate(source.date);
    if (typeof source.date === "string" && sourceDate === null) {
      findings.push(
        finding(`${base}.date`, "source-date", "Source date must be a real calendar date in YYYY-MM-DD format."),
      );
    } else if (sourceDate !== null && updatedAt !== null && sourceDate > updatedAt) {
      findings.push(
        finding(`${base}.date`, "future-source-date", "Source date cannot be later than map.updatedAt."),
      );
    }
    const retrievedAt = retrievalDate(source.retrievedAt);
    if (typeof source.retrievedAt === "string" && retrievedAt === null) {
      findings.push(
        finding(
          `${base}.retrievedAt`,
          "retrieval-date",
          "retrievedAt must be YYYY-MM-DD or an ISO UTC timestamp ending in Z.",
        ),
      );
    } else if (retrievedAt !== null && updatedAt !== null && retrievedAt > updatedAt) {
      findings.push(
        finding(`${base}.retrievedAt`, "future-retrieval", "retrievedAt cannot be later than map.updatedAt."),
      );
    } else if (retrievedAt !== null && sourceDate !== null && retrievedAt < sourceDate) {
      findings.push(
        finding(`${base}.retrievedAt`, "retrieval-before-source", "retrievedAt cannot predate the source date."),
      );
    }
    if (typeof source.url === "string" && !sourceLocation(source.url)) {
      findings.push(
        finding(
          `${base}.url`,
          "source-url",
          "Source location must be http(s), file://, or a relative or absolute local path.",
        ),
      );
    }
    if (typeof source.locator === "string" && !boundedLocator(source.locator)) {
      findings.push(
        finding(
          `${base}.locator`,
          "source-locator",
          "Locator must identify a bounded page, section, line range, or timestamp (for example p. 7, § 2.1, L12-L18, Section: Results, or 00:04:31).",
        ),
      );
    }
    if (typeof source.excerpt === "string" && source.excerpt.trim().length < 40) {
      findings.push(
        finding(
          `${base}.excerpt`,
          "thin-excerpt",
          "Source excerpt must contain at least 40 characters of checkable context.",
        ),
      );
    }
    if (typeof source.excerpt === "string" && source.excerpt.trim().length > 500) {
      findings.push(
        finding(
          `${base}.excerpt`,
          "oversized-excerpt",
          "Keep source excerpts under 500 characters and link to the full source.",
        ),
      );
    }
    if (
      typeof source.excerpt === "string"
      && source.excerpt.trim().length >= 40
      && source.excerpt.trim().length <= 500
      && !substantiveExcerpt(source.excerpt)
    ) {
      findings.push(
        finding(
          `${base}.excerpt`,
          "low-information-excerpt",
          "Source excerpt must contain varied, checkable content rather than repeated filler.",
        ),
      );
    }
    if (source.verification != null) {
      const verification = source.verification;
      const verificationBase = `${base}.verification`;
      if (!verification || typeof verification !== "object" || Array.isArray(verification)) {
        findings.push(
          finding(verificationBase, "verification-type", "verification must be an object."),
        );
      } else {
        if (verification.status !== "verified") {
          findings.push(
            finding(`${verificationBase}.status`, "verification-status", "Verification status must be verified."),
          );
        }
        if (verification.method !== "normalized-excerpt-match") {
          findings.push(
            finding(
              `${verificationBase}.method`,
              "verification-method",
              "Verification method must be normalized-excerpt-match.",
            ),
          );
        }
        if (!validUtcTimestamp(verification.checkedAt)) {
          findings.push(
            finding(
              `${verificationBase}.checkedAt`,
              "verification-time",
              "Verification checkedAt must be an ISO UTC timestamp ending in Z.",
            ),
          );
        } else if (source.retrievedAt !== verification.checkedAt.slice(0, 10)) {
          findings.push(
            finding(
              `${verificationBase}.checkedAt`,
              "verification-retrieval-mismatch",
              "A verified source retrievedAt must equal the UTC date in verification.checkedAt.",
            ),
          );
        }
        for (const key of ["contentSha256", "excerptSha256"]) {
          if (typeof verification[key] !== "string" || !/^[a-f0-9]{64}$/.test(verification[key])) {
            findings.push(
              finding(
                `${verificationBase}.${key}`,
                "verification-digest",
                `${key} must be a lowercase SHA-256 digest.`,
              ),
            );
          }
        }
        if (!["matched", "not-machine-checked"].includes(verification.locatorStatus)) {
          findings.push(
            finding(
              `${verificationBase}.locatorStatus`,
              "verification-locator",
              "locatorStatus must be matched or not-machine-checked.",
            ),
          );
        }
        if (typeof verification.finalUrl !== "string" || !sourceLocation(verification.finalUrl)) {
          findings.push(
            finding(
              `${verificationBase}.finalUrl`,
              "verification-url",
              "finalUrl must be an http(s), file://, or local path source location.",
            ),
          );
        }
      }
    }
  }

  const incoming = new Map(nodes.filter((node) => node?.id).map((node) => [node.id, 0]));
  const adjacency = new Map(nodes.filter((node) => node?.id).map((node) => [node.id, []]));
  const uniqueEdges = new Set();
  for (const [index, edge] of edges.entries()) {
    const base = `$.edges[${index}]`;
    if (!edge || typeof edge !== "object" || Array.isArray(edge)) {
      findings.push(finding(base, "edge-type", "Each edge must be an object."));
      continue;
    }
    if (!nodeIds.has(edge.from)) {
      findings.push(finding(`${base}.from`, "unknown-node", `Unknown from node: ${edge.from}.`));
    }
    if (!nodeIds.has(edge.to)) {
      findings.push(finding(`${base}.to`, "unknown-node", `Unknown to node: ${edge.to}.`));
    }
    if (edge.from && edge.from === edge.to) {
      findings.push(finding(base, "self-edge", `Node ${edge.from} cannot point to itself.`));
    }
    const edgeKey = `${edge.from}\0${edge.to}\0${edge.relation}`;
    if (uniqueEdges.has(edgeKey)) {
      findings.push(
        finding(base, "duplicate-edge", "Duplicate from/to/relation edges are not allowed."),
      );
    } else {
      uniqueEdges.add(edgeKey);
    }
    if (!RELATIONS.has(edge.relation)) {
      findings.push(
        finding(
          `${base}.relation`,
          "edge-relation",
          `Relation must be one of: ${[...RELATIONS].join(", ")}.`,
        ),
      );
    }
    if (!edge.note || typeof edge.note !== "string") {
      findings.push(
        finding(`${base}.note`, "edge-note", "Each reasoning edge needs a plain-language note."),
      );
    }
    if (nodeIds.has(edge.to)) incoming.set(edge.to, (incoming.get(edge.to) || 0) + 1);
    if (nodeIds.has(edge.from) && nodeIds.has(edge.to) && edge.from !== edge.to) {
      adjacency.get(edge.from).push(edge.to);
    }
  }

  for (const [index, node] of nodes.entries()) {
    if (!node || typeof node !== "object") continue;
    const base = `$.nodes[${index}]`;
    if (node.type === "evidence" && !node.sourceId) {
      findings.push(
        finding(`${base}.sourceId`, "unsourced-evidence", "Evidence nodes require sourceId."),
      );
    }
    if (node.sourceId && !sourceIds.has(node.sourceId)) {
      findings.push(
        finding(
          `${base}.sourceId`,
          "unknown-source",
          `Node references unknown source: ${node.sourceId}.`,
        ),
      );
    }
    if (
      node.type === "evidence" &&
      node.id &&
      !edges.some((edge) => edge?.from === node.id)
    ) {
      findings.push(
        finding(base, "unused-evidence", "Evidence must participate in at least one reasoning edge."),
      );
    }
  }

  for (const [index, source] of sources.entries()) {
    if (
      source?.id &&
      !nodes.some((node) => node?.type === "evidence" && node.sourceId === source.id)
    ) {
      findings.push(
        finding(
          `$.sources[${index}]`,
          "unused-source",
          "Every source must be attached to at least one evidence node.",
        ),
      );
    }
  }

  const positions = nodes.filter((node) => node?.type === "position");
  if (positions.length !== 1) {
    findings.push(
      finding("$.nodes", "position-count", "The map must contain exactly one position node."),
    );
  } else if (!incoming.get(positions[0].id)) {
    findings.push(
      finding(
        `$.nodes[${nodes.indexOf(positions[0])}]`,
        "unsupported-position",
        "The position needs at least one incoming reasoning edge.",
      ),
    );
  } else {
    for (const [index, node] of nodes.entries()) {
      if (!node?.id || node.id === positions[0].id) continue;
      if (!reaches(node.id, positions[0].id, adjacency)) {
        findings.push(
          finding(
            `$.nodes[${index}]`,
            "disconnected-node",
            `Node ${node.id} must have a directed reasoning path to the position.`,
          ),
        );
      }
    }
  }

  const visitState = new Map();
  const cyclicNodes = new Set();
  function visit(nodeId, stack = []) {
    const state = visitState.get(nodeId) || 0;
    if (state === 1) {
      for (const member of stack.slice(stack.indexOf(nodeId))) cyclicNodes.add(member);
      return;
    }
    if (state === 2) return;
    visitState.set(nodeId, 1);
    for (const next of adjacency.get(nodeId) || []) visit(next, [...stack, nodeId]);
    visitState.set(nodeId, 2);
  }
  for (const nodeId of nodeIds) visit(nodeId);
  for (const nodeId of cyclicNodes) {
    const index = nodes.findIndex((node) => node?.id === nodeId);
    findings.push(
      finding(`$.nodes[${index}]`, "reasoning-cycle", `Node ${nodeId} participates in a reasoning cycle.`),
    );
  }

  const metrics = {
    claims: nodes.filter((node) => node?.type === "claim").length,
    contradictions: new Set(
      edges
        .filter((edge) => edge?.relation === "contradicts")
        .map((edge) => `${edge.from}\0${edge.to}\0${edge.relation}`),
    ).size,
    evidence: nodes.filter((node) => node?.type === "evidence").length,
    sources: sources.length,
    unknowns: nodes.filter((node) => node?.type === "unknown").length,
  };
  return {
    findings,
    metrics,
    receipt: null,
    valid: findings.length === 0,
  };
}

export function validateMapContract(map) {
  const result = inspectMapContract(map);
  if (!result.valid) throw new MapValidationError(result.findings);
  return result;
}
