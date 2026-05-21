#!/usr/bin/env python3
"""
Batch translate RAG-Azure-Builder files from Spanish to English
Uses Azure OpenAI for high-quality translations
"""

import os
import json
from pathlib import Path
from azure.openai import AzureOpenAI

# Configure Azure OpenAI
client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version="2024-08-01-preview",
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
)

def translate_file(file_path: Path) -> str:
    """Translate a Spanish markdown file to English using Claude"""

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    prompt = f"""You are a professional technical translator. Translate this RAG/Azure documentation file from Spanish to English.

CRITICAL REQUIREMENTS:
- Translate ALL content to English (including descriptions, text, examples)
- Preserve ALL markdown formatting, structure, code blocks, links
- Keep technical terms accurate: "Azure AI Search", "Azure OpenAI", etc.
- Preserve emoji and visual separators
- Use professional but accessible tone
- Keep the same line breaks and indentation

FILE: {file_path.name}

CONTENT TO TRANSLATE:
```
{content}
```

Return ONLY the translated markdown file content. Do not include explanations or meta-commentary."""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are an expert technical translator from Spanish to English. Translate precisely, preserving all formatting and structure."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
        max_tokens=4000
    )

    return response.choices[0].message.content

def translate_directory(directory: Path, pattern: str):
    """Translate all matching files in a directory"""

    files = sorted(list(directory.glob(pattern)))
    print(f"\n📁 Found {len(files)} files to translate in {directory}")
    print(f"   Pattern: {pattern}\n")

    for i, file_path in enumerate(files, 1):
        print(f"[{i}/{len(files)}] Translating {file_path.name}...", end=" ", flush=True)

        try:
            translated = translate_file(file_path)

            # Backup original
            backup_path = file_path.with_suffix(file_path.suffix + '.es.bak')
            file_path.rename(backup_path)

            # Write translated
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(translated)

            print("✅ Done")
        except Exception as e:
            print(f"❌ Error: {e}")
            # Restore backup if exists
            if backup_path.exists():
                backup_path.rename(file_path)

def main():
    repo_root = Path(__file__).parent

    print("=" * 70)
    print("RAG-Azure-Builder: Spanish → English Translator")
    print("=" * 70)

    # Translate agents
    translate_directory(repo_root / "agents", "rag-*.agent.md")

    # Translate skills (SKILL.md files)
    print(f"\n📁 Translating skill descriptions...")
    for skill_dir in sorted((repo_root / "skills").glob("rag-*")):
        skill_md = skill_dir / "SKILL.md"
        if skill_md.exists():
            print(f"[SKill] {skill_dir.name}/SKILL.md...", end=" ", flush=True)
            try:
                translated = translate_file(skill_md)
                backup_path = skill_md.with_suffix(skill_md.suffix + '.es.bak')
                skill_md.rename(backup_path)
                with open(skill_md, 'w', encoding='utf-8') as f:
                    f.write(translated)
                print("✅ Done")
            except Exception as e:
                print(f"❌ Error: {e}")

    # Translate instructions
    translate_directory(repo_root / "instructions", "*rag*.md")

    print("\n" + "=" * 70)
    print("✅ Translation complete!")
    print("=" * 70)
    print("\n📝 Backups saved with .es.bak extension")
    print("   Verify translations and commit changes:\n")
    print("   git add .")
    print("   git commit -m 'feat: translate RAG-Azure-Builder to English'")
    print("   git push origin main\n")

if __name__ == "__main__":
    main()
