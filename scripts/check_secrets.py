#!/usr/bin/env python3
"""Pre-commit security hook: Prevents API keys, credentials, and secrets from being committed."""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

# Common high-entropy API key and secret patterns
SECRET_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("Google Gemini / Cloud API Key", re.compile(r"AIza[0-9A-Za-z\-_]{35}")),
    ("OpenAI API Key", re.compile(r"sk-[a-zA-Z0-9T3_\-]{20,}")),
    ("Anthropic Claude API Key", re.compile(r"sk-ant-[a-zA-Z0-9_\-]{20,}")),
    ("GitHub Personal Access Token", re.compile(r"gh[pous]_[0-9a-zA-Z]{36,}")),
    ("Private Encryption Key", re.compile(r"-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----")),
    ("Hardcoded Secret / Password Assignment", re.compile(r"""(?:API_KEY|SECRET_KEY|PASSWORD|AUTH_TOKEN)\s*=\s*['"][A-Za-z0-9_\-]{16,}['"]""", re.IGNORECASE)),
]

SAFE_EXCLUSIONS = {
    ".env.example",
    "check_secrets.py",
}


def get_staged_files() -> list[str]:
    try:
        res = subprocess.run(
            ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
            capture_output=True,
            text=True,
            check=True,
        )
        return [f.strip() for f in res.stdout.splitlines() if f.strip()]
    except Exception:
        return []


def check_file_for_secrets(filepath: Path) -> list[str]:
    if not filepath.exists() or filepath.is_dir():
        return []
    if filepath.name in SAFE_EXCLUSIONS:
        return []
    if any(part in {".git", "node_modules", "dist", ".venv", "venv", "__pycache__"} for part in filepath.parts):
        return []

    try:
        content = filepath.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return []

    findings = []
    for line_no, line in enumerate(content.splitlines(), start=1):
        for name, pattern in SECRET_PATTERNS:
            match = pattern.search(line)
            if match:
                masked = match.group(0)[:4] + "..." + match.group(0)[-4:]
                findings.append(f"{filepath}:{line_no} - Detected {name} (Value: {masked})")
    return findings


def main() -> int:
    staged = get_staged_files()
    if not staged:
        # If running standalone, check current working tree changes
        staged = [str(p) for p in Path(".").rglob("*") if p.is_file() and not any(part in {".git", "node_modules", "dist", ".venv", "venv"} for part in p.parts)]

    violations = []
    for f in staged:
        violations.extend(check_file_for_secrets(Path(f)))

    if violations:
        print("\n" + "=" * 70, file=sys.stderr)
        print("[BLOCKED] COMMIT BLOCKED BY EXPIREGUARD SECRET GUARDRAIL", file=sys.stderr)
        print("Potential API key or secret detected in staged files:", file=sys.stderr)
        print("=" * 70, file=sys.stderr)
        for v in violations:
            print(f"  [X] {v}", file=sys.stderr)
        print("\nNever commit live credentials or API keys to GitHub.", file=sys.stderr)
        print("Keep secrets exclusively in 'backend/.env' (which is git-ignored).\n", file=sys.stderr)
        return 1

    print("[PASSED] Secret Guardrail Check: No API keys or credentials detected.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
