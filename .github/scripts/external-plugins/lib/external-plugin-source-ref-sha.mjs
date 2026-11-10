export function normalizeCommitSha(value) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return /^[0-9a-f]{40}$/.test(normalized) ? normalized : undefined;
}

export function evaluateRefShaConsistency({ ref, sha, resolvedRefCommitSha }) {
  const normalizedSha = normalizeCommitSha(sha);
  const normalizedRefCommitSha = normalizeCommitSha(resolvedRefCommitSha);

  if (!normalizedSha || !normalizedRefCommitSha) {
    return {
      comparable: false,
      matches: true,
      normalizedSha,
      normalizedRefCommitSha,
    };
  }

  return {
    comparable: true,
    matches: normalizedSha === normalizedRefCommitSha,
    normalizedSha,
    normalizedRefCommitSha,
    ref: typeof ref === "string" ? ref.trim() : "",
    sha: typeof sha === "string" ? sha.trim() : "",
  };
}
