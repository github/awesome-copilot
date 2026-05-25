from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
import time
from pathlib import Path
from typing import Any, TypedDict


class RaptorNode(TypedDict):
	id: str
	level: int
	heading: str
	text: str
	embedding: list[float]
	children: list[str]


class RaptorTree(TypedDict):
	nodes: list[RaptorNode]


class StructuredSummary(TypedDict):
	documentTitle: str
	globalSummary: dict[str, Any]
	raptorTree: RaptorTree


_HEADING_RE = re.compile(
	r"""
	^(?:
		(?P<md>\#{1,6})\s+(?P<md_title>.+)
	  | (?P<num>\d+(?:\.\d+)*)[.)]\s+(?P<num_title>.+)
	  | (?P<caps>[A-Z][A-Z\s]{4,})$
	)
	""",
	re.VERBOSE | re.MULTILINE,
)
_PARA_SPLIT_RE = re.compile(r"\n\s*\n")
_TOKEN_RE = re.compile(r"[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*|[^\W\s_]+", re.UNICODE)
DEFAULT_EMBEDDING_DIM = 384
CLUSTER_THRESHOLD = 0.55
MAX_CLUSTER_SUMMARY_CHARS = 2000


def _heading_level(match: re.Match[str]) -> tuple[int, str]:
	if match.group("md"):
		return len(match.group("md")), match.group("md_title").strip()
	if match.group("num"):
		depth = match.group("num").count(".") + 1
		return min(depth + 1, 6), match.group("num_title").strip()
	if match.group("caps"):
		return 2, match.group("caps").strip().title()
	return 2, ""


def _split_sections_by_headings(markdown: str, min_chars: int = 100) -> list[dict[str, Any]]:
	sections: list[dict[str, Any]] = []
	current_heading = "Introduction"
	current_level = 1
	current_lines: list[str] = []

	for line in markdown.split("\n"):
		match = _HEADING_RE.match(line.strip())
		if match:
			text = "\n".join(current_lines).strip()
			if text and len(text) >= min_chars:
				sections.append({"heading": current_heading, "text": text, "level": current_level})
			current_level, current_heading = _heading_level(match)
			current_lines = []
		else:
			current_lines.append(line)

	text = "\n".join(current_lines).strip()
	if text and len(text) >= min_chars:
		sections.append({"heading": current_heading, "text": text, "level": current_level})
	return sections


def _extract_paragraph_heading(text: str, max_len: int = 80) -> str:
	first_line = text.split("\n", 1)[0].strip()
	heading = re.sub(r"[*_`#]", "", first_line).strip()
	if heading.startswith("|"):
		cells = [cell.strip() for cell in heading.split("|") if cell.strip()]
		heading = cells[0] if cells else heading
	if len(heading) > max_len:
		shortened = heading[:max_len].rsplit(" ", 1)[0].strip()
		heading = f"{shortened or heading[:max_len]}..."
	return heading or "Section"


def _tokenize(text: str) -> list[str]:
	return [token.lower() for token in _TOKEN_RE.findall(text) if token.strip()]


def _normalize(vector: list[float]) -> list[float]:
	norm = math.sqrt(sum(value * value for value in vector))
	if norm <= 1e-12:
		return vector
	return [value / norm for value in vector]


def _hash_embedding(text: str, *, dim: int = DEFAULT_EMBEDDING_DIM) -> list[float]:
	tokens = _tokenize(text)
	vector = [0.0] * dim
	if not tokens:
		return vector

	features = list(tokens)
	features.extend(f"{left} {right}" for left, right in zip(tokens, tokens[1:]))

	for feature in features:
		digest = hashlib.blake2b(feature.encode("utf-8"), digest_size=8).digest()
		index = int.from_bytes(digest[:4], "little") % dim
		sign = 1.0 if digest[4] & 1 else -1.0
		weight = 1.0 + min(len(feature), 20) / 80.0
		vector[index] += sign * weight
	return _normalize(vector)


_ONNX_SESSION: Any = None  # ort.InferenceSession once loaded
_ONNX_TOKENIZER: Any = None  # tokenizers.Tokenizer once loaded
_ONNX_TRIED: bool = False

_EXTERNAL_MODEL_DIR = Path(__file__).parent.parent / "external" / "all-MiniLM-L6-v2"


def _try_load_onnx() -> bool:
	"""Load the ONNX session and tokenizer from external/. Returns True on success."""
	global _ONNX_SESSION, _ONNX_TOKENIZER, _ONNX_TRIED
	if _ONNX_TRIED:
		return _ONNX_SESSION is not None
	_ONNX_TRIED = True

	model_path = _EXTERNAL_MODEL_DIR / "model_quantized.onnx"
	tokenizer_path = _EXTERNAL_MODEL_DIR / "tokenizer.json"
	if not model_path.exists() or not tokenizer_path.exists():
		return False

	try:
		import onnxruntime as ort
		from tokenizers import Tokenizer

		session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
		tok = Tokenizer.from_file(str(tokenizer_path))
		tok.enable_truncation(max_length=256)
		tok.enable_padding(pad_id=0, pad_token="[PAD]")
		_ONNX_SESSION = session
		_ONNX_TOKENIZER = tok
		print("[raptor] Using local ONNX embedding model (all-MiniLM-L6-v2).", file=sys.stderr)
		return True
	except Exception as exc:
		print(f"[raptor] Could not load ONNX model, falling back to hash embeddings: {exc}", file=sys.stderr)
		return False


def _embed_with_onnx(texts: list[str], *, prefix: str, dim: int) -> list[list[float]]:
	import numpy as np

	prefixed = [f"{prefix}{text}" for text in texts]
	encodings = _ONNX_TOKENIZER.encode_batch(prefixed)
	input_ids = np.array([enc.ids for enc in encodings], dtype=np.int64)
	attention_mask = np.array([enc.attention_mask for enc in encodings], dtype=np.int64)
	input_names = {inp.name for inp in _ONNX_SESSION.get_inputs()}
	feed: dict[str, Any] = {"input_ids": input_ids, "attention_mask": attention_mask}
	if "token_type_ids" in input_names:
		feed["token_type_ids"] = np.zeros_like(input_ids)

	outputs = _ONNX_SESSION.run(None, feed)
	token_embeddings: Any = outputs[0]  # (batch, seq_len, hidden_dim)
	mask = attention_mask[..., np.newaxis].astype(np.float32)
	mean_embeddings = (token_embeddings * mask).sum(axis=1) / mask.sum(axis=1)
	norms = np.linalg.norm(mean_embeddings, axis=1, keepdims=True)
	normed = mean_embeddings / np.where(norms < 1e-12, 1.0, norms)

	# Adjust output dimension if needed (model native dim is 384)
	native_dim = normed.shape[1]
	if dim < native_dim:
		normed = normed[:, :dim]
	elif dim > native_dim:
		pad = np.zeros((normed.shape[0], dim - native_dim), dtype=normed.dtype)
		normed = np.concatenate([normed, pad], axis=1)

	return normed.tolist()


def embed(texts: list[str], *, prefix: str = "passage: ", dim: int = DEFAULT_EMBEDDING_DIM) -> list[list[float]]:
	if _try_load_onnx():
		return _embed_with_onnx(texts, prefix=prefix, dim=dim)
	return [_hash_embedding(f"{prefix}{text}", dim=dim) for text in texts]


def _cosine(a: list[float], b: list[float]) -> float:
	return sum(left * right for left, right in zip(a, b))


def _weighted_average(a: list[float], a_count: int, b: list[float], b_count: int) -> list[float]:
	total = max(a_count + b_count, 1)
	return _normalize([(left * a_count + right * b_count) / total for left, right in zip(a, b)])


def _split_sections_by_char_budget(paragraphs: list[str], target_chars: int = 2000) -> list[dict[str, Any]]:
	sections: list[dict[str, Any]] = []
	group: list[str] = []
	group_len = 0

	for paragraph in paragraphs:
		if group and group_len + len(paragraph) > target_chars:
			combined = "\n\n".join(group)
			sections.append({"heading": _extract_paragraph_heading(combined), "text": combined, "level": 1})
			group = []
			group_len = 0
		group.append(paragraph)
		group_len += len(paragraph)

	if group:
		combined = "\n\n".join(group)
		sections.append({"heading": _extract_paragraph_heading(combined), "text": combined, "level": 1})
	return sections


def _split_sections_by_semantics(
	markdown: str,
	*,
	target_chars: int = 2000,
	max_chars: int = 4000,
	similarity_threshold: float = 0.25,
	embedding_dim: int = DEFAULT_EMBEDDING_DIM,
) -> list[dict[str, Any]]:
	paragraphs = [paragraph.strip() for paragraph in _PARA_SPLIT_RE.split(markdown) if paragraph.strip()]
	if not paragraphs:
		return []
	if len(paragraphs) == 1:
		return [{"heading": _extract_paragraph_heading(paragraphs[0]), "text": paragraphs[0], "level": 1}]

	embeddings = embed([paragraph[:700] for paragraph in paragraphs], dim=embedding_dim)
	consecutive_sims = [_cosine(embeddings[index], embeddings[index + 1]) for index in range(len(embeddings) - 1)]

	sections: list[dict[str, Any]] = []
	group = [paragraphs[0]]
	group_len = len(paragraphs[0])

	for index in range(1, len(paragraphs)):
		paragraph = paragraphs[index]
		similarity = consecutive_sims[index - 1] if index - 1 < len(consecutive_sims) else 1.0
		budget_exceeded = group_len + len(paragraph) > max_chars
		topic_shift = group_len >= target_chars and similarity < similarity_threshold

		if budget_exceeded or topic_shift:
			combined = "\n\n".join(group)
			sections.append({"heading": _extract_paragraph_heading(combined), "text": combined, "level": 1})
			group = [paragraph]
			group_len = len(paragraph)
		else:
			group.append(paragraph)
			group_len += len(paragraph)

	if group:
		combined = "\n\n".join(group)
		sections.append({"heading": _extract_paragraph_heading(combined), "text": combined, "level": 1})
	return sections or _split_sections_by_char_budget(paragraphs, target_chars=target_chars)


def _heading_section_threshold(content_len: int) -> int:
	return max(2, min(8, content_len // 3000))


def split_sections(markdown: str, *, min_chars: int = 100, embedding_dim: int = DEFAULT_EMBEDDING_DIM) -> list[dict[str, Any]]:
	heading_sections = _split_sections_by_headings(markdown, min_chars=min_chars)
	threshold = _heading_section_threshold(len(markdown))
	if len(heading_sections) >= threshold:
		return heading_sections

	total_chars = sum(len(section["text"]) for section in heading_sections) if heading_sections else len(markdown)
	if total_chars < min_chars * 2:
		return heading_sections or [{"heading": "Document", "text": markdown.strip(), "level": 1}]

	print(
		f"[raptor] Heading split yielded {len(heading_sections)} section(s); using semantic paragraph grouping.",
		file=sys.stderr,
	)
	return _split_sections_by_semantics(markdown, embedding_dim=embedding_dim)


def _agglomerative_cluster(
	ids: list[str],
	embeddings: list[list[float]],
	*,
	threshold: float = CLUSTER_THRESHOLD,
) -> list[list[str]]:
	if len(ids) <= 1:
		return [ids] if ids else []

	clusters = [[node_id] for node_id in ids]
	centroids = [list(embedding) for embedding in embeddings]

	while len(clusters) > 1:
		best_i = -1
		best_j = -1
		best_similarity = -1.0
		for i in range(len(clusters)):
			for j in range(i + 1, len(clusters)):
				similarity = _cosine(centroids[i], centroids[j])
				if similarity > best_similarity:
					best_i, best_j, best_similarity = i, j, similarity

		if best_i < 0 or best_j < 0 or best_similarity < threshold:
			break

		left_count = len(clusters[best_i])
		right_count = len(clusters[best_j])
		clusters[best_i].extend(clusters[best_j])
		centroids[best_i] = _weighted_average(centroids[best_i], left_count, centroids[best_j], right_count)
		del clusters[best_j]
		del centroids[best_j]

	return clusters


def _make_cluster_summary(sections: list[dict[str, Any]]) -> str:
	parts: list[str] = []
	for section in sections:
		parts.append(f"## {section['heading']}")
		text = str(section.get("text", ""))[:500].strip()
		if text:
			parts.append(text)
	return "\n".join(parts)[:MAX_CLUSTER_SUMMARY_CHARS]


def build_raptor_tree(
	sections: list[dict[str, Any]],
	embeddings: list[list[float]],
	*,
	cluster_threshold: float = CLUSTER_THRESHOLD,
	embedding_dim: int = DEFAULT_EMBEDDING_DIM,
) -> tuple[RaptorTree, dict[str, Any]]:
	all_nodes: list[RaptorNode] = []
	leaf_ids: list[str] = []
	leaf_embeddings: list[list[float]] = []

	for index, (section, embedding) in enumerate(zip(sections, embeddings)):
		node_id = f"L0-{index}"
		node: RaptorNode = {
			"id": node_id,
			"level": 0,
			"heading": str(section["heading"]),
			"text": str(section["text"])[:3000],
			"embedding": embedding,
			"children": [],
		}
		all_nodes.append(node)
		leaf_ids.append(node_id)
		leaf_embeddings.append(embedding)

	current_ids = leaf_ids
	current_embeddings = leaf_embeddings
	level = 1

	while len(current_ids) > 1 and level <= 5:
		clusters = _agglomerative_cluster(current_ids, current_embeddings, threshold=cluster_threshold)
		if all(len(cluster) == 1 for cluster in clusters):
			break

		node_map = {node["id"]: node for node in all_nodes}
		next_ids: list[str] = []
		next_embeddings: list[list[float]] = []

		for cluster_index, cluster_member_ids in enumerate(clusters):
			if len(cluster_member_ids) == 1:
				node = node_map[cluster_member_ids[0]]
				next_ids.append(node["id"])
				next_embeddings.append(node["embedding"])
				continue

			cluster_sections = [
				{"heading": node_map[member_id]["heading"], "text": node_map[member_id]["text"]}
				for member_id in cluster_member_ids
				if member_id in node_map
			]
			summary_text = _make_cluster_summary(cluster_sections)
			headings = [str(section["heading"]) for section in cluster_sections]
			cluster_embedding = embed([summary_text], dim=embedding_dim)[0]
			cluster_id = f"L{level}-{cluster_index}"
			cluster_node: RaptorNode = {
				"id": cluster_id,
				"level": level,
				"heading": f"Cluster: {', '.join(headings[:3])}{'...' if len(headings) > 3 else ''}",
				"text": summary_text,
				"embedding": cluster_embedding,
				"children": cluster_member_ids,
			}
			all_nodes.append(cluster_node)
			next_ids.append(cluster_id)
			next_embeddings.append(cluster_embedding)

		current_ids = next_ids
		current_embeddings = next_embeddings
		level += 1

	node_map = {node["id"]: node for node in all_nodes}
	top_nodes = [node_map[node_id] for node_id in current_ids if node_id in node_map]
	main_theme = " | ".join(node["heading"] for node in top_nodes[:5])[:500]
	global_summary = {
		"mainTheme": main_theme,
		"sectionCount": len(sections),
		"topNodeCount": len(top_nodes),
		"embedding": embed([main_theme or "document summary"], dim=embedding_dim)[0],
	}
	return {"nodes": all_nodes}, global_summary


def build_from_markdown(
	markdown: str,
	*,
	title: str = "Untitled",
	min_chars: int = 100,
	embedding_dim: int = DEFAULT_EMBEDDING_DIM,
	cluster_threshold: float = CLUSTER_THRESHOLD,
) -> StructuredSummary:
	started_at = time.perf_counter()
	sections = split_sections(markdown, min_chars=min_chars, embedding_dim=embedding_dim)
	if not sections:
		sections = [{"heading": title, "text": markdown[:5000], "level": 1}]
	split_at = time.perf_counter()
	print(f"[raptor] Split into {len(sections)} sections ({split_at - started_at:.2f}s)", file=sys.stderr)

	texts_to_embed = [f"{section['heading']}. {str(section['text'])[:1000]}" for section in sections]
	embeddings = embed(texts_to_embed, dim=embedding_dim)
	embed_at = time.perf_counter()
	print(f"[raptor] Embedded {len(embeddings)} sections ({embed_at - split_at:.2f}s)", file=sys.stderr)

	tree, global_summary = build_raptor_tree(
		sections,
		embeddings,
		cluster_threshold=cluster_threshold,
		embedding_dim=embedding_dim,
	)
	done_at = time.perf_counter()
	print(f"[raptor] Built tree with {len(tree['nodes'])} nodes ({done_at - embed_at:.2f}s)", file=sys.stderr)

	return {
		"documentTitle": title,
		"globalSummary": global_summary,
		"raptorTree": tree,
	}


def build_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(description="Build a RAPTOR-style tree from markdown.")
	group = parser.add_mutually_exclusive_group(required=True)
	group.add_argument("--markdown-path", help="Path to a markdown file.")
	group.add_argument("--markdown", help="Raw markdown text.")
	parser.add_argument("--output-path", required=True, help="Where to write the structured summary JSON.")
	parser.add_argument("--title", default="Untitled", help="Document title.")
	parser.add_argument("--min-chars", type=int, default=100, help="Minimum characters required for a section.")
	parser.add_argument("--embedding-dim", type=int, default=DEFAULT_EMBEDDING_DIM, help="Stable embedding vector size.")
	parser.add_argument("--cluster-threshold", type=float, default=CLUSTER_THRESHOLD, help="Cosine threshold for cluster merges.")
	parser.add_argument("--pretty", action="store_true", help="Pretty-print the output JSON file.")
	return parser


def main() -> int:
	if hasattr(sys.stdout, "reconfigure"):
		sys.stdout.reconfigure(encoding="utf-8")
	if hasattr(sys.stderr, "reconfigure"):
		sys.stderr.reconfigure(encoding="utf-8")

	args = build_parser().parse_args()
	markdown = Path(args.markdown_path).read_text(encoding="utf-8") if args.markdown_path else args.markdown
	summary = build_from_markdown(
		markdown,
		title=args.title,
		min_chars=args.min_chars,
		embedding_dim=args.embedding_dim,
		cluster_threshold=args.cluster_threshold,
	)

	output_path = Path(args.output_path).expanduser()
	output_path.parent.mkdir(parents=True, exist_ok=True)
	output_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2 if args.pretty else None), encoding="utf-8")
	print(json.dumps({"ok": True, "nodes": len(summary["raptorTree"]["nodes"]), "path": str(output_path)}, ensure_ascii=False))
	return 0


if __name__ == "__main__":
	raise SystemExit(main())