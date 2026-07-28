#!/usr/bin/env bash

# 验证各 IDE 配置路径是否与 IDE Registry 一致 (real path validation)。
#
# 通过调用 smart-ide-migration.sh 的只读诊断标志 --print-path 获取每个
# IDE/对象类型解析出的真实路径，并与 registry 规范值逐一精确比对。
# 任何不匹配都会打印 FAIL 行，并在结束时以非 0 退出码返回。

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_SCRIPT="${SCRIPT_DIR}/smart-ide-migration.sh"

if [[ ! -f "$MIGRATION_SCRIPT" ]]; then
    echo "错误: 找不到迁移脚本: $MIGRATION_SCRIPT" >&2
    exit 1
fi

# 期望的 registry 规范路径。格式: "ide|object|expected"。
# object ∈ global|project|mcp|config|rules
EXPECTED=(
    "kimiai|global|~/.kimi-code/skills"
    "kimiai|project|.kimi-code/skills"
    "kimiai|rules|AGENTS.md"
    "kimiai|config|~/.kimi-code/config.toml"
    "kimiai|mcp|~/.kimi-code/mcp.json"
    "copilot|global|~/.copilot/skills"
    "codex|global|~/.agents/skills"
    "workbuddy|global|~/.workbuddy/skills"
    "workbuddy|project|.workbuddy/skills"
    "workbuddy|mcp|~/.workbuddy/.mcp.json"
    "workbuddy|config|~/.workbuddy/settings.json"
    "claude|global|~/.claude/skills"
    "openclaw|global|~/.openclaw/skills"
)

failures=0
checks=0

echo "========================================"
echo "验证 IDE 配置路径 (real validation)"
echo "========================================"
echo ""

for entry in "${EXPECTED[@]}"; do
    ide="${entry%%|*}"
    rest="${entry#*|}"
    object="${rest%%|*}"
    expected="${rest#*|}"

    checks=$((checks + 1))

    actual="$(bash "$MIGRATION_SCRIPT" --print-path "$ide" "$object" 2>/dev/null)"
    rc=$?

    if [[ $rc -ne 0 ]]; then
        echo "FAIL: ${ide}/${object} - 脚本退出非零 (无法解析路径)"
        failures=$((failures + 1))
        continue
    fi

    if [[ "$actual" == "$expected" ]]; then
        echo "PASS: ${ide}/${object} -> ${actual}"
    else
        echo "FAIL: ${ide}/${object}"
        echo "  expected: ${expected}"
        echo "  actual:   ${actual}"
        failures=$((failures + 1))
    fi
done

echo ""
echo "========================================"
if [[ $failures -eq 0 ]]; then
    echo "全部通过 (PASS): ${checks} 项检查全部与 registry 一致"
    echo "========================================"
    exit 0
else
    echo "验证失败 (FAIL): ${failures}/${checks} 项不匹配"
    echo "========================================"
    exit 1
fi
