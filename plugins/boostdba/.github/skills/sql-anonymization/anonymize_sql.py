#!/usr/bin/env python3
"""
Generic SQL Database Anonymizer.

Anonymizes SQL exports without hardcoded project/user/schema values.
It discovers entities dynamically and applies deterministic replacements.

Usage:
    python anonymize_sql.py -i input.sql -o output.sql
    python anonymize_sql.py -i input.sql -o output.sql -m custom_mappings.json -v
"""

import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path


DEFAULT_EXCLUDED_SCHEMAS = {
    "dbo",
    "sys",
    "guest",
    "information_schema",
}

EXCLUDED_IDENTIFIER_KEYWORDS = {
    "PRIMARY",
    "KEY",
    "UNIQUE",
    "DEFAULT",
    "CHECK",
    "FOREIGN",
    "REFERENCES",
    "CLUSTERED",
    "NONCLUSTERED",
    "ASC",
    "DESC",
}


def load_custom_mappings(mappings_path):
    """Load optional custom mappings JSON."""
    if not mappings_path:
        return {}

    path = Path(mappings_path)
    if not path.exists():
        raise FileNotFoundError(f"Mappings file not found: {path}")

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, dict):
        raise ValueError("Mappings file must contain a JSON object")

    return data


def apply_exact_replacements(content, replacements, category, mappings, verbose=False):
    """Apply exact string replacements with accounting."""
    total = 0
    if not isinstance(replacements, dict):
        return content, total

    for old, new in replacements.items():
        if not old:
            continue
        new = str(new)
        count = content.count(old)
        if count:
            content = content.replace(old, new)
            mappings[category][old] = new
            total += count
            if verbose:
                print(f"    [{count:6d}] {old} -> {new}")

    return content, total


def build_mapping(candidates, prefix, existing_count=0):
    """Create deterministic mapping for sorted candidates."""
    mapping = {}
    for idx, value in enumerate(sorted(candidates), start=existing_count + 1):
        mapping[value] = f"{prefix}_{idx}"
    return mapping


def replace_identifier(content, old, new):
    """Replace bracketed and plain SQL identifier tokens."""
    bracketed = re.compile(rf"\[{re.escape(old)}\]", flags=re.IGNORECASE)
    plain = re.compile(rf"\b{re.escape(old)}\b", flags=re.IGNORECASE)

    count_a = len(bracketed.findall(content))
    count_b = len(plain.findall(content))

    if count_a:
        content = bracketed.sub(f"[{new}]", content)
    if count_b:
        content = plain.sub(new, content)

    return content, count_a + count_b


def replace_bracketed_identifier(content, old, new):
    """Replace only bracketed identifiers to avoid touching free text."""
    bracketed = re.compile(rf"\[{re.escape(old)}\]", flags=re.IGNORECASE)
    count = len(bracketed.findall(content))
    if count:
        content = bracketed.sub(f"[{new}]", content)
    return content, count


def replace_bracketed_identifiers_with_map(content, replacement_map):
    """Replace [identifier] tokens in one pass using a mapping."""
    total = 0

    def repl(match):
        nonlocal total
        ident = match.group(1)
        new_ident = replacement_map.get(ident.lower())
        if new_ident:
            total += 1
            return f"[{new_ident}]"
        return match.group(0)

    content = re.sub(r"\[([^\]\r\n]+)\]", repl, content)
    return content, total


def replace_unbracketed_identifiers_with_map(content, replacement_map, protected_keywords):
    """Replace unbracketed identifiers in one optimized pass (DISABLED for now).
    
    This is disabled because it's too slow for 43MB files.
    Column names can already be anonymized via bracketed identifiers.
    
    Args:
        content: SQL content to process
        replacement_map: dict mapping old identifier (lowercase) to new identifier
        protected_keywords: set of keywords to never replace
        
    Returns:
        tuple: (modified content, count of replacements)
    """
    # DISABLED: iterating over 18k+ identifiers makes this too slow
    # Column anonymization happens via bracketed identifier step
    return content, 0


def is_generated_placeholder(name):
    """Return True if identifier already looks anonymized."""
    return bool(
        re.match(
            r"^(?:DATABASE|SCHEMA|DOMAIN|USER|PRINCIPAL|PATH|IDENTIFIER)_\d+$",
            name,
            flags=re.IGNORECASE,
        )
    )


def is_valid_identifier_candidate(name):
    """Accept only SQL-like identifier names, reject expression fragments."""
    return bool(re.match(r"^[A-Za-z_#][A-Za-z0-9_@$# ]{0,127}$", name))


def anonymize_sql(input_path, output_path, encoding="utf-16", verbose=False, mappings_path=None):
    """Anonymize SQL content using dynamic detection."""
    input_path = Path(input_path)
    output_path = Path(output_path)

    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    print(f"[*] Reading file ({input_path.stat().st_size / (1024*1024):.1f} MB)...")
    with open(input_path, "r", encoding=encoding, errors="replace") as f:
        content = f.read()

    custom = load_custom_mappings(mappings_path)
    mappings = defaultdict(dict)
    total_count = 0

    print("[*] Anonymizing content...")

    # 1) User-provided exact replacements (if any).
    content, count = apply_exact_replacements(
        content,
        custom.get("exact_replacements", {}),
        "exact_replacements",
        mappings,
        verbose,
    )
    total_count += count

    # 2) Database names from explicit database DDL only.
    db_candidates = set()
    db_patterns = [
        r"\b(?:USE|CREATE\s+DATABASE|ALTER\s+DATABASE|DROP\s+DATABASE)\s+\[([^\]]+)\]",
        r"\b(?:USE|CREATE\s+DATABASE|ALTER\s+DATABASE|DROP\s+DATABASE)\s+([A-Za-z_][A-Za-z0-9_]*)",
    ]
    for pattern in db_patterns:
        db_candidates.update(re.findall(pattern, content, flags=re.IGNORECASE))

    excluded_dbs = {
        d.strip().lower()
        for d in custom.get("exclude_databases", [])
        if isinstance(d, str) and d.strip()
    }
    db_candidates = {
        db for db in db_candidates if db and db.strip() and db.strip().lower() not in excluded_dbs
    }

    db_map = build_mapping(db_candidates, "DATABASE")
    for old, new in db_map.items():
        # Replace only explicit DB statements to avoid false positives in code/comments.
        stmt_pattern = re.compile(
            rf"(\b(?:USE|CREATE\s+DATABASE|ALTER\s+DATABASE|DROP\s+DATABASE)\s+)(\[?{re.escape(old)}\]?)",
            flags=re.IGNORECASE,
        )
        count = 0

        def _db_repl(match):
            nonlocal count
            count += 1
            return f"{match.group(1)}[{new}]"

        content = stmt_pattern.sub(_db_repl, content)
        if count:
            mappings["databases"][old] = new
            total_count += count
            if verbose:
                print(f"    [{count:6d}] {old} -> {new}")

    # 3) Schema names from explicit schema/object DDL contexts.
    schema_candidates = set()
    schema_patterns = [
        r"\b(?:CREATE|ALTER)\s+SCHEMA\s+\[([^\]]+)\]",
        r"\b(?:CREATE|ALTER)\s+SCHEMA\s+([A-Za-z_][A-Za-z0-9_]*)",
        r"\b(?:CREATE|ALTER)\s+(?:PROCEDURE|PROC|FUNCTION|VIEW|TRIGGER|TABLE|SYNONYM)\s+\[([^\]]+)\]\s*\.\s*\[[^\]]+\]",
        r"\bSCHEMA::\[([^\]]+)\]",
    ]
    for pattern in schema_patterns:
        schema_candidates.update(re.findall(pattern, content, flags=re.IGNORECASE))

    excluded_schemas = set(DEFAULT_EXCLUDED_SCHEMAS)
    excluded_schemas.update(
        s.strip().lower()
        for s in custom.get("exclude_schemas", [])
        if isinstance(s, str) and s.strip()
    )
    schema_candidates = {
        s for s in schema_candidates if s and s.strip() and s.strip().lower() not in excluded_schemas
    }

    schema_map = build_mapping(schema_candidates, "SCHEMA")
    for old, new in schema_map.items():
        count = 0

        # CREATE/ALTER SCHEMA [x]
        schema_decl = re.compile(
            rf"(\b(?:CREATE|ALTER)\s+SCHEMA\s+)\[?{re.escape(old)}\]?",
            flags=re.IGNORECASE,
        )

        def _schema_decl_repl(match):
            nonlocal count
            count += 1
            return f"{match.group(1)}[{new}]"

        content = schema_decl.sub(_schema_decl_repl, content)

        # CREATE/ALTER object [schema].[name]
        object_decl = re.compile(
            rf"(\b(?:CREATE|ALTER)\s+(?:PROCEDURE|PROC|FUNCTION|VIEW|TRIGGER|TABLE|SYNONYM)\s+)\[{re.escape(old)}\](\s*\.\s*\[[^\]]+\])",
            flags=re.IGNORECASE,
        )

        def _object_decl_repl(match):
            nonlocal count
            count += 1
            return f"{match.group(1)}[{new}]{match.group(2)}"

        content = object_decl.sub(_object_decl_repl, content)

        # SCHEMA::[x]
        schema_scope = re.compile(rf"\bSCHEMA::\[{re.escape(old)}\]", flags=re.IGNORECASE)
        c_scope = len(schema_scope.findall(content))
        if c_scope:
            content = schema_scope.sub(f"SCHEMA::[{new}]", content)
            count += c_scope

        if count:
            mappings["schemas"][old] = new
            total_count += count
            if verbose:
                print(f"    [{count:6d}] {old} -> {new}")

    # 4) Bracketed domain\\user principals only (avoid matching file paths).
    principal_pairs = re.findall(
        r"\[([A-Za-z][A-Za-z0-9_.-]{1,63})\\([A-Za-z][A-Za-z0-9_.-]{1,127})\]",
        content,
    )
    domains = {d for d, _ in principal_pairs}
    users = {u for _, u in principal_pairs}

    domain_map = build_mapping(domains, "DOMAIN")
    user_map = build_mapping(users, "USER")

    for old, new in domain_map.items():
        token_pattern = re.compile(rf"\[{re.escape(old)}\\\\", flags=re.IGNORECASE)
        count = len(token_pattern.findall(content))
        if count:
            content = token_pattern.sub(f"[{new}\\", content)
            mappings["domains"][old] = new
            total_count += count
            if verbose:
                print(f"    [{count:6d}] {old}\\ -> {new}\\")

    for old, new in user_map.items():
        pattern = re.compile(rf"(\[[A-Za-z0-9_.-]+\\){re.escape(old)}(\])", flags=re.IGNORECASE)
        count = len(pattern.findall(content))
        if count:
            content = pattern.sub(rf"\1{new}\2", content)
            mappings["users"][old] = new
            total_count += count
            if verbose:
                print(f"    [{count:6d}] {old} -> {new}")

    # 5) Email addresses.
    emails = sorted(
        set(re.findall(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", content))
    )
    email_map = {email: f"user_{idx}@example.com" for idx, email in enumerate(emails, start=1)}
    content, count = apply_exact_replacements(content, email_map, "emails", mappings, verbose)
    total_count += count

    # 5.5) Author/person names from multiple contexts:
    #   - After metadata labels: "Autor:", "Author:", etc.
    #   - In XML/HTML tags: <Author>, <Name>, etc.
    #   - Free-standing capitalized names in comments
    author_candidates = set()
    
    # Pattern 1: After metadata labels
    pattern1 = r"(?:Autor|Author|Creador|Creator|Modified by|Modificado por|Actualización|Update)[\s:]+([A-Z][a-záéíóúàèìòùäëïöüA-Z\s\-]{2,}?)(?=\s*$|[\r\n*]|--)"
    author_candidates.update(re.findall(pattern1, content, flags=re.IGNORECASE | re.MULTILINE))
    
    # Pattern 2: In XML/HTML tags like <Author>Name</Author>, <Nombre>Value</Nombre>
    pattern2 = r"<(?:Author|Autor|Name|Nombre|Creator|Creador)>([A-Z][a-záéíóúàèìòùäëïöüA-Z\s\-]+?)</(?:Author|Autor|Name|Nombre|Creator|Creador)>"
    author_candidates.update(re.findall(pattern2, content, flags=re.IGNORECASE))
    
    # Pattern 3: Capitalized name pairs (FirstName LastName) that look like people
    pattern3 = r"\b([A-Z][a-záéíóúàèìòùäëïöü]+(?:\s+[A-Z][a-záéíóúàèìòùäëïöü]+){1,3})\b"
    potential_names = re.findall(pattern3, content)
    # Filter to keep only those with 2+ words and reasonable length
    for name in potential_names:
        word_count = len(name.split())
        if word_count >= 2 and len(name) >= 8 and len(name) <= 60:
            author_candidates.add(name)
    
    # Exclude SQL keywords and system names
    excluded_names = {
        "SELECT", "FROM", "WHERE", "GROUP", "ORDER", "INSERT", "UPDATE", "DELETE",
        "CREATE", "ALTER", "DROP", "TABLE", "VIEW", "SCHEMA", "DATABASE",
        "PROCEDURE", "FUNCTION", "TRIGGER", "INDEX", "KEY", "PRIMARY", "FOREIGN",
        "CHECK", "CONSTRAINT", "DEFAULT", "NOT", "NULL", "AND", "OR", "IN", "ON",
        "VALUES", "SET", "LIKE", "BETWEEN", "CASE", "WHEN", "THEN", "ELSE", "END",
        "BEGIN", "COMMIT", "ROLLBACK", "TRANSACTION", "GO", "USE", "IF", "EXEC"
    }
    author_candidates = {
        name.strip() for name in author_candidates 
        if name.strip() and name.upper() not in excluded_names and len(name.strip()) > 3
    }
    
    author_map = {author: f"AUTHOR_{idx}" for idx, author in enumerate(sorted(author_candidates), start=1)}
    content, count = apply_exact_replacements(content, author_map, "authors", mappings, verbose)
    total_count += count

    # 6) Declared SQL principals without domain prefix.
    principal_candidates = set()
    principal_patterns = [
        r"\bCREATE\s+(?:LOGIN|USER)\s+\[([^\]]+)\]",
        r"\bFOR\s+LOGIN\s+\[([^\]]+)\]",
        r"\bALTER\s+USER\s+\[([^\]]+)\]",
    ]
    for pattern in principal_patterns:
        principal_candidates.update(re.findall(pattern, content, flags=re.IGNORECASE))

    principal_candidates = {
        p
        for p in principal_candidates
        if p and p.strip() and "\\" not in p and p.upper() not in {"SA", "GUEST"}
    }

    principal_map = build_mapping(principal_candidates, "PRINCIPAL")
    for old, new in principal_map.items():
        count = 0

        login_decl = re.compile(
            rf"(\bCREATE\s+(?:LOGIN|USER)\s+)\[{re.escape(old)}\]",
            flags=re.IGNORECASE,
        )

        def _login_decl_repl(match):
            nonlocal count
            count += 1
            return f"{match.group(1)}[{new}]"

        content = login_decl.sub(_login_decl_repl, content)

        for_login = re.compile(rf"(\bFOR\s+LOGIN\s+)\[{re.escape(old)}\]", flags=re.IGNORECASE)

        def _for_login_repl(match):
            nonlocal count
            count += 1
            return f"{match.group(1)}[{new}]"

        content = for_login.sub(_for_login_repl, content)

        alter_user = re.compile(rf"(\bALTER\s+USER\s+)\[{re.escape(old)}\]", flags=re.IGNORECASE)

        def _alter_user_repl(match):
            nonlocal count
            count += 1
            return f"{match.group(1)}[{new}]"

        content = alter_user.sub(_alter_user_repl, content)

        if count:
            mappings["principals"][old] = new
            total_count += count
            if verbose:
                print(f"    [{count:6d}] {old} -> {new}")

    # 7) Windows file paths.
    paths = sorted(set(re.findall(r"\b[A-Za-z]:\\[^\r\n\t\'\";]+", content)))
    for idx, path in enumerate(paths, start=1):
        anon_path = f"D:\\PATH_{idx}"
        count = content.count(path)
        if count:
            content = content.replace(path, anon_path)
            mappings["paths"][path] = anon_path
            total_count += count
            if verbose:
                print(f"    [{count:6d}] {path} -> {anon_path}")

    # 8) Generic bracketed SQL identifiers (tables, columns, constraints, indexes, etc.)
    protected_identifiers = set(DEFAULT_EXCLUDED_SCHEMAS)
    protected_identifiers.update(s.lower() for s in custom.get("exclude_schemas", []))
    protected_identifiers.update(d.lower() for d in custom.get("exclude_databases", []))

    for category in ("databases", "schemas", "domains", "users", "principals"):
        protected_identifiers.update(str(v).lower() for v in mappings.get(category, {}).values())

    bracketed_ids = sorted(set(re.findall(r"\[([^\]\r\n]+)\]", content)))
    identifier_candidates = {
        ident
        for ident in bracketed_ids
        if ident
        and is_valid_identifier_candidate(ident)
        and not is_generated_placeholder(ident)
        and ident.lower() not in protected_identifiers
        and ident.upper() not in EXCLUDED_IDENTIFIER_KEYWORDS
    }

    identifier_map = build_mapping(identifier_candidates, "IDENTIFIER")
    if identifier_map:
        replacement_map = {old.lower(): new for old, new in identifier_map.items()}
        content, count = replace_bracketed_identifiers_with_map(content, replacement_map)
        if count:
            mappings["identifiers"].update(identifier_map)
            total_count += count
            if verbose:
                print(f"    [{count:6d}] bracketed identifier replacements")

    # 9) Unbracketed column names from TABLE/temp-table definitions.
    #    Uses paren-depth matching to find all TABLE (...) blocks, extracts
    #    identifiers that appear before a SQL type keyword, and replaces them
    #    with deterministic COLUMN_N tokens across the whole file in one pass.
    table_col_candidates = set()
    pos = 0
    while True:
        m = re.search(r"TABLE\s*\(", content[pos:], flags=re.IGNORECASE)
        if not m:
            break
        start = pos + m.start() + m.group().index("(")
        depth = 1
        i = start + 1
        while i < len(content) and depth > 0:
            if content[i] == "(":
                depth += 1
            elif content[i] == ")":
                depth -= 1
            i += 1
        if depth == 0:
            inner = content[start + 1 : i - 1]
            inner = re.sub(r"--.*?$", "", inner, flags=re.MULTILINE)
            inner = re.sub(r"/\*.*?\*/", "", inner, flags=re.DOTALL)
            cols = re.findall(
                r"[\s,]([A-Za-z_][A-Za-z0-9_]*)\s+(?:INT|VARCHAR|NVARCHAR|CHAR|NCHAR|DECIMAL|FLOAT|REAL|DATETIME|SMALLDATETIME|DATE|TIME|BIT|BIGINT|SMALLINT|TINYINT|TEXT|XML|NUMERIC|MONEY|UNIQUEIDENTIFIER|VARBINARY|IMAGE|BINARY)\b",
                inner,
                re.IGNORECASE,
            )
            table_col_candidates.update(cols)
        pos = i

    # Filter out already-anonymized placeholders and SQL keywords
    _col_excluded = protected_identifiers | {
        k.lower() for k in EXCLUDED_IDENTIFIER_KEYWORDS
    }
    table_col_candidates = {
        c for c in table_col_candidates
        if c.lower() not in _col_excluded and not is_generated_placeholder(c)
    }

    if table_col_candidates:
        sorted_col_candidates = sorted(table_col_candidates, key=str.lower)
        col_name_map = {
            col.lower(): f"COLUMN_{idx}"
            for idx, col in enumerate(sorted_col_candidates, start=1)
        }
        col_pattern = re.compile(
            r"(?<!\[)\b(" + "|".join(re.escape(c) for c in sorted_col_candidates) + r")\b(?!\])",
            flags=re.IGNORECASE,
        )
        col_count = 0

        def _col_repl(match):
            nonlocal col_count
            col_count += 1
            return col_name_map[match.group(1).lower()]

        content = col_pattern.sub(_col_repl, content)
        if col_count:
            mappings["column_names"] = {c: col_name_map[c.lower()] for c in sorted_col_candidates}
            total_count += col_count
            if verbose:
                print(f"    [{col_count:6d}] unbracketed column replacements ({len(sorted_col_candidates)} unique columns)")

    print(f"\n[*] Writing output ({len(content) / (1024*1024):.1f} MB)...")
    with open(output_path, "w", encoding=encoding) as f:
        f.write(content)

    print("[*] Saving mappings...")
    with open(output_path.parent / "anonymization_mappings.json", "w", encoding="utf-8") as f:
        json.dump(dict(mappings), f, ensure_ascii=False, indent=2)

    print("\n[+] Anonymization complete")
    print(f"    Input:    {input_path}")
    print(f"    Output:   {output_path}")
    print(f"    Total replacements: {total_count}")
    print("\n[*] Summary:")
    for category, items in mappings.items():
        print(f"    - {category}: {len(items)} items")


def main():
    parser = argparse.ArgumentParser(
        description="Anonymize SQL Server exports for safe sharing without hardcoded rules",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python anonymize_sql.py -i db.sql -o db_anon.sql
  python anonymize_sql.py -i db.sql -o db_anon.sql -m custom_mappings.json -v
        """,
    )

    parser.add_argument(
        "-i",
        "--input",
        default="input/db.sql",
        help="Input SQL file (default: input/db.sql)",
    )

    parser.add_argument(
        "-o",
        "--output",
        default="input/db_anonymized.sql",
        help="Output SQL file (default: input/db_anonymized.sql)",
    )

    parser.add_argument(
        "--encoding",
        default="utf-16",
        help="File encoding (default: utf-16)",
    )

    parser.add_argument(
        "-m",
        "--mappings",
        default=None,
        help="Optional custom mappings JSON file",
    )

    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Verbose output",
    )

    args = parser.parse_args()

    try:
        anonymize_sql(args.input, args.output, args.encoding, args.verbose, args.mappings)
    except Exception as e:
        print(f"\n[-] Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
