#!/usr/bin/env python3
"""Validate repository alignment with Microsoft references and customization guidelines."""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Tuple


@dataclass
class CheckResult:
    name: str
    status: str  # pass, warn, fail
    details: str


class MicrosoftGuidelinesValidator:
    """Repository compliance checks for agent/instruction/skill conventions."""

    REQUIRED_ROOT_FILES = [
        ".github/README.md",
        ".github/AGENTS.md",
        ".github/ARCHITECTURE.md",
        ".github/rag-best-practices.md",
    ]

    REQUIRED_TEMPLATE_FILES = [
        ".github/TEMPLATE.agent.md",
        ".github/instructions/TEMPLATE.instructions.md",
        ".github/skills/TEMPLATE.SKILL.md",
    ]

    REQUIRED_AGENT_FRONTMATTER_FIELDS = ["name", "description", "model", "tools", "skills"]
    REQUIRED_SKILL_FRONTMATTER_FIELDS = ["name", "description"]

    def __init__(self, root: Path):
        self.root = root
        self.results: List[CheckResult] = []

    def run(self) -> Dict[str, object]:
        # Layer 1: repository structure hygiene
        self.check_required_files()
        self.check_agents_folder_purity()
        self.check_agent_frontmatter()
        self.check_instruction_pairing()
        self.check_skill_frontmatter()
        self.check_rag_reference_coverage()
        self.check_microsoft_references()
        self.check_naming_conventions()
        # Layer 2: RAG quality (aligned with Microsoft Learn best practices)
        self.check_hybrid_search_usage()
        self.check_semantic_ranking()
        self.check_chunking_strategy()
        self.check_vectorization()
        self.check_token_limits()
        self.check_index_schema_completeness()
        self.check_rag_best_practices_content()
        return self.report()

    def add(self, name: str, status: str, details: str) -> None:
        self.results.append(CheckResult(name=name, status=status, details=details))

    def report(self) -> Dict[str, object]:
        passed = sum(1 for r in self.results if r.status == "pass")
        warnings = sum(1 for r in self.results if r.status == "warn")
        failed = sum(1 for r in self.results if r.status == "fail")
        return {
            "summary": {
                "passed": passed,
                "warnings": warnings,
                "failed": failed,
                "compliant": failed == 0,
            },
            "checks": [asdict(r) for r in self.results],
        }

    def check_required_files(self) -> None:
        missing = []
        for rel in self.REQUIRED_ROOT_FILES + self.REQUIRED_TEMPLATE_FILES:
            if not (self.root / rel).exists():
                missing.append(rel)

        if missing:
            self.add("required_files", "fail", f"Missing required files: {missing}")
        else:
            self.add("required_files", "pass", "All required root/template files exist")

    def check_agents_folder_purity(self) -> None:
        agents_dir = self.root / ".github" / "agents"
        if not agents_dir.exists():
            self.add("agents_folder", "fail", "Missing .github/agents folder")
            return

        invalid = []
        for p in agents_dir.iterdir():
            if p.is_file() and p.suffix != ".md":
                invalid.append(p.name)
            if p.is_file() and p.suffix == ".md" and not p.name.endswith(".agent.md"):
                invalid.append(p.name)

        if invalid:
            self.add("agents_folder", "fail", f"agents/ must contain only *.agent.md files. Invalid: {invalid}")
        else:
            self.add("agents_folder", "pass", "agents/ contains only .agent.md definitions")

    def _parse_frontmatter(self, content: str) -> Dict[str, str]:
        content = content.lstrip("\ufeff\r\n \t")
        if not content.startswith("---"):
            return {}

        end = content.find("\n---", 3)
        if end == -1:
            return {}

        block = content[4:end].splitlines()
        data: Dict[str, str] = {}
        for line in block:
            if ":" not in line:
                continue
            key, value = line.split(":", 1)
            data[key.strip()] = value.strip().strip("'\"")
        return data

    def check_agent_frontmatter(self) -> None:
        agents = sorted((self.root / ".github" / "agents").glob("*.agent.md"))
        if not agents:
            self.add("agent_frontmatter", "fail", "No .agent.md files found")
            return

        missing_fields: List[Tuple[str, List[str]]] = []
        for agent in agents:
            content = agent.read_text(encoding="utf-8", errors="ignore")
            fm = self._parse_frontmatter(content)
            missing = [f for f in self.REQUIRED_AGENT_FRONTMATTER_FIELDS if f not in fm]
            if missing:
                missing_fields.append((agent.name, missing))

        if missing_fields:
            self.add("agent_frontmatter", "fail", f"Missing frontmatter fields: {missing_fields}")
        else:
            self.add("agent_frontmatter", "pass", "All agents include required frontmatter fields")

    def check_instruction_pairing(self) -> None:
        agents = sorted((self.root / ".github" / "agents").glob("rag-*.agent.md"))
        instructions_dir = self.root / ".github" / "instructions"
        missing = []

        for agent in agents:
            stem = agent.name.removesuffix(".agent.md")
            expected = instructions_dir / f"agent-{stem}.instructions.md"

            # Support historical naming aliases used by this repository.
            aliases = {
                "rag-indexer-specialist": ["agent-rag-indexer.instructions.md"],
            }

            candidates = [expected] + [instructions_dir / name for name in aliases.get(stem, [])]
            if not any(c.exists() for c in candidates):
                missing.append(expected.name)

        if missing:
            self.add("instruction_pairing", "warn", f"Missing instruction files for agents: {missing}")
        else:
            self.add("instruction_pairing", "pass", "Each rag-* agent has corresponding instructions")

    def check_skill_frontmatter(self) -> None:
        skill_files = sorted((self.root / ".github" / "skills").glob("*/SKILL.md"))
        if not skill_files:
            self.add("skill_frontmatter", "fail", "No SKILL.md files found")
            return

        missing_fields: List[Tuple[str, List[str]]] = []
        for skill_file in skill_files:
            content = skill_file.read_text(encoding="utf-8", errors="ignore")
            fm = self._parse_frontmatter(content)
            missing = [f for f in self.REQUIRED_SKILL_FRONTMATTER_FIELDS if f not in fm]
            if missing:
                missing_fields.append((str(skill_file.relative_to(self.root)), missing))

        if missing_fields:
            self.add("skill_frontmatter", "warn", f"Some SKILL.md files miss fields: {missing_fields}")
        else:
            self.add("skill_frontmatter", "pass", "All SKILL.md files contain required frontmatter fields")

    def check_microsoft_references(self) -> None:
        files_to_scan = [
            self.root / ".github" / "README.md",
            self.root / ".github" / "AGENTS.md",
            self.root / ".github" / "rag-best-practices.md",
        ]

        total_links = 0
        placeholder_links = 0

        for file_path in files_to_scan:
            if not file_path.exists():
                continue
            text = file_path.read_text(encoding="utf-8", errors="ignore")
            total_links += len(re.findall(r"https://learn\.microsoft\.com", text, flags=re.IGNORECASE))
            placeholder_links += len(re.findall(r"learn\.microsoft\.com/\.\.\.", text, flags=re.IGNORECASE))

        if total_links == 0:
            self.add("microsoft_references", "fail", "No Microsoft Learn links found in key docs")
            return

        if placeholder_links > 0:
            self.add("microsoft_references", "warn", f"Found {placeholder_links} placeholder Microsoft links")
        else:
            self.add("microsoft_references", "pass", f"Found {total_links} Microsoft Learn references in key docs")

    def check_rag_reference_coverage(self) -> None:
        required_url = "https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=videos"

        targets: List[Path] = []
        targets.extend(sorted((self.root / ".github" / "agents").glob("*.agent.md")))
        targets.extend(
            sorted(
                p
                for p in (self.root / ".github" / "instructions").glob("*.instructions.md")
                if p.name != "TEMPLATE.instructions.md"
            )
        )
        targets.extend(sorted((self.root / ".github" / "skills").glob("*/SKILL.md")))

        missing = []
        for path in targets:
            text = path.read_text(encoding="utf-8", errors="ignore")
            if required_url not in text:
                missing.append(str(path.relative_to(self.root)))

        if missing:
            self.add(
                "rag_reference_coverage",
                "fail",
                f"Missing official RAG reference URL in files: {missing}",
            )
        else:
            self.add("rag_reference_coverage", "pass", "All agents/instructions/skills include official RAG reference")

    def check_naming_conventions(self) -> None:
        bad_agents = []
        bad_instructions = []

        for p in (self.root / ".github" / "agents").glob("*.agent.md"):
            if not p.name.startswith("rag-"):
                bad_agents.append(p.name)

        for p in (self.root / ".github" / "instructions").glob("*.instructions.md"):
            if p.name == "TEMPLATE.instructions.md":
                continue
            if not p.name.startswith("agent-rag-") and p.name not in [
                "rag-setup-standards.instructions.md",
                "rag-base-setup.instructions.md",
            ]:
                bad_instructions.append(p.name)

        if bad_agents or bad_instructions:
            self.add(
                "naming_conventions",
                "warn",
                f"Non-standard naming. agents={bad_agents}, instructions={bad_instructions}",
            )
        else:
            self.add("naming_conventions", "pass", "Naming conventions are aligned")

    # ------------------------------------------------------------------
    # Layer 2: RAG quality checks (aligned with Microsoft Learn best practices)
    # https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview
    # ------------------------------------------------------------------

    def _collect_scripts(self, *subdirs: str) -> List[Path]:
        """Return Python scripts under the given subdirectories of root."""
        scripts: List[Path] = []
        for subdir in subdirs:
            target = self.root / subdir
            if target.exists():
                scripts.extend(target.rglob("*.py"))
        return scripts

    def check_hybrid_search_usage(self) -> None:
        """Verify query scripts use hybrid search: keyword + semantic or vector queries.

        Microsoft guidance: https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview
        """
        query_scripts = self._collect_scripts("scripts/consulta", "scripts")
        if not query_scripts:
            self.add("hybrid_search", "warn", "No query scripts found to validate hybrid search pattern")
            return

        has_search_text = False
        has_semantic_or_vector = False

        for script in query_scripts:
            text = script.read_text(encoding="utf-8", errors="ignore")
            if "search_text=" in text or '"search_text"' in text:
                has_search_text = True
            if (
                'query_type="semantic"' in text
                or "vector_queries" in text
                or "vectors=" in text
                or "VectorizedQuery" in text
            ):
                has_semantic_or_vector = True

        if has_search_text and has_semantic_or_vector:
            self.add(
                "hybrid_search",
                "pass",
                "Query scripts implement hybrid search (keyword + semantic/vector)",
            )
        elif has_search_text:
            self.add(
                "hybrid_search",
                "warn",
                "Keyword search found but no semantic ranking or vector queries — "
                "add query_type='semantic' or vector_queries for hybrid recall",
            )
        else:
            self.add(
                "hybrid_search",
                "fail",
                "No hybrid search pattern detected — queries must combine keyword and vector/semantic search",
            )

    def check_semantic_ranking(self) -> None:
        """Verify SemanticConfiguration is defined in the index and activated at query time.

        Microsoft guidance: https://learn.microsoft.com/en-us/azure/search/semantic-ranking
        """
        all_scripts = self._collect_scripts("scripts")
        if not all_scripts:
            self.add("semantic_ranking", "warn", "No scripts found to validate semantic ranking")
            return

        found_in_query = False
        found_in_index = False

        for path in all_scripts:
            text = path.read_text(encoding="utf-8", errors="ignore")
            if "semantic_configuration_name" in text or 'query_type="semantic"' in text:
                found_in_query = True
            if "SemanticConfiguration" in text or "SemanticSearch" in text:
                found_in_index = True

        if found_in_query and found_in_index:
            self.add(
                "semantic_ranking",
                "pass",
                "Semantic ranking configured in both index schema and query layer",
            )
        elif found_in_query:
            self.add(
                "semantic_ranking",
                "warn",
                "Semantic ranking used in queries but SemanticConfiguration not found in index definition",
            )
        elif found_in_index:
            self.add(
                "semantic_ranking",
                "warn",
                "SemanticConfiguration defined in index but not activated in query layer — add semantic_configuration_name",
            )
        else:
            self.add(
                "semantic_ranking",
                "fail",
                "Semantic ranking not configured — required for Classic RAG relevance quality",
            )

    def check_chunking_strategy(self) -> None:
        """Verify indexing scripts split documents into chunks.

        Addresses Microsoft's token-constraint challenge: 
        https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview#solving-token-constraint-challenges
        """
        index_scripts = self._collect_scripts("scripts/indexacion")
        # Also accept a top-level indexar.py
        top_level = self.root / "scripts" / "indexar.py"
        if top_level.exists():
            index_scripts.append(top_level)

        if not index_scripts:
            self.add("chunking_strategy", "warn", "No indexing scripts found to validate chunking")
            return

        chunk_keywords = ["chunk", "split", "max_chunk", "chunk_size", "overlap"]
        found: List[str] = []

        for script in index_scripts:
            text = script.read_text(encoding="utf-8", errors="ignore").lower()
            for kw in chunk_keywords:
                if kw in text and kw not in found:
                    found.append(kw)

        if found:
            self.add(
                "chunking_strategy",
                "pass",
                f"Chunking patterns detected ({', '.join(found)}) — aligns with Microsoft content-preparation guidance",
            )
        else:
            self.add(
                "chunking_strategy",
                "fail",
                "No chunking strategy detected in indexing scripts — required to manage LLM token constraints",
            )

    def check_vectorization(self) -> None:
        """Verify the indexing pipeline generates vector embeddings for similarity search."""
        all_scripts = self._collect_scripts("scripts")
        if not all_scripts:
            self.add("vectorization", "warn", "No scripts found to validate vectorization")
            return

        embedding_patterns = [
            "embedding",
            "embed(",
            "VectorSearch",
            "VectorizedQuery",
            "get_embeddings",
            "create_embedding",
            "embeddings.create",
        ]

        found_in: List[str] = []
        for script in all_scripts:
            text = script.read_text(encoding="utf-8", errors="ignore")
            if any(p in text for p in embedding_patterns):
                found_in.append(script.name)

        if found_in:
            self.add(
                "vectorization",
                "pass",
                f"Embedding/vectorization calls found in: {', '.join(found_in[:3])}{'...' if len(found_in) > 3 else ''}",
            )
        else:
            self.add(
                "vectorization",
                "fail",
                "No vectorization detected — hybrid search requires vector embeddings at index time",
            )

    def check_token_limits(self) -> None:
        """Verify query scripts configure result limits (top-k) to prevent LLM token overflow.

        Microsoft guidance: configure top-n for text, top-k for vectors.
        """
        query_scripts = list((self.root / "scripts").rglob("consultar.py"))
        query_scripts += list((self.root / "scripts").rglob("probar-busqueda.py"))

        if not query_scripts:
            self.add("token_limits", "warn", "No query entry scripts found to validate result limits")
            return

        limit_patterns = ["top=", "top_k=", "top_k ", '"top":', "max_results", "top_n"]
        found = False

        for script in query_scripts:
            text = script.read_text(encoding="utf-8", errors="ignore")
            if any(p in text for p in limit_patterns):
                found = True
                break

        if found:
            self.add(
                "token_limits",
                "pass",
                "Result limits (top-k/top-n) configured — prevents LLM token overflow",
            )
        else:
            self.add(
                "token_limits",
                "fail",
                "No result limits (top/top_k) found in query scripts — risk of sending too many tokens to the LLM",
            )

    def check_index_schema_completeness(self) -> None:
        """Verify index definition includes required RAG fields: key, content, vector, semantic config."""
        all_scripts = self._collect_scripts("scripts")
        if not all_scripts:
            self.add("index_schema", "warn", "No scripts found to validate index schema")
            return

        all_text = "\n".join(
            s.read_text(encoding="utf-8", errors="ignore") for s in all_scripts
        )

        required: Dict[str, List[str]] = {
            "key_field": [r"key=True", r'"key":\s*true', r"SimpleField"],
            "content_field": [r"SearchableField", r'name=["\']content["\']'],
            "vector_field": [r"Collection.*Single", r"VectorSearch", r"dimensions="],
            "semantic_config": [r"SemanticConfiguration", r"SemanticSearch"],
        }

        missing = [
            field
            for field, patterns in required.items()
            if not any(re.search(p, all_text) for p in patterns)
        ]

        if missing:
            self.add(
                "index_schema",
                "warn",
                f"Index schema may be missing RAG-required components: {missing}",
            )
        else:
            self.add(
                "index_schema",
                "pass",
                "Index schema contains required RAG fields (key, content, vector, semantic config)",
            )

    def check_rag_best_practices_content(self) -> None:
        """Verify rag-best-practices.md covers the 5 Microsoft RAG challenges.

        Challenges per: https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview#the-challenges-of-rag
        """
        bp_file = self.root / ".github" / "rag-best-practices.md"
        if not bp_file.exists():
            self.add(
                "rag_best_practices_content",
                "fail",
                "rag-best-practices.md missing — required to document RAG compliance decisions",
            )
            return

        text = bp_file.read_text(encoding="utf-8", errors="ignore").lower()

        challenges: Dict[str, List[str]] = {
            "query_understanding": ["hybrid", "semantic", "query"],
            "token_constraints": ["token", "chunk", "top-k", "top_k", "limit"],
            "multi_source": ["indexer", "source", "blob", "sharepoint", "knowledge"],
            "security": ["security", "trimming", "filter", "access", "entra"],
            "response_time": ["latency", "response time", "performance", "timeout"],
        }

        missing_challenges = [
            challenge
            for challenge, keywords in challenges.items()
            if not any(kw in text for kw in keywords)
        ]

        if missing_challenges:
            self.add(
                "rag_best_practices_content",
                "warn",
                f"rag-best-practices.md may not address RAG challenges: {missing_challenges}",
            )
        else:
            self.add(
                "rag_best_practices_content",
                "pass",
                "rag-best-practices.md covers the 5 Microsoft RAG challenges",
            )


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Microsoft references and repository guidelines")
    parser.add_argument("--root", default=".", help="Repository root path")
    parser.add_argument("--json", action="store_true", help="Print JSON output")
    parser.add_argument("--strict", action="store_true", help="Treat warnings as failures")
    args = parser.parse_args()

    validator = MicrosoftGuidelinesValidator(Path(args.root).resolve())
    report = validator.run()

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=True))
    else:
        print("Microsoft Guidelines Validation")
        print("=" * 40)
        for check in report["checks"]:
            print(f"[{check['status'].upper():4}] {check['name']}: {check['details']}")
        print("-" * 40)
        summary = report["summary"]
        print(
            f"passed={summary['passed']} warnings={summary['warnings']} failed={summary['failed']} compliant={summary['compliant']}"
        )

    summary = report["summary"]
    if summary["failed"] > 0:
        return 1
    if args.strict and summary["warnings"] > 0:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
