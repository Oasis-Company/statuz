#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path


def detect_language(root: Path) -> str:
    if (root / "package.json").exists():
        return "typescript/javascript"
    if (root / "pyproject.toml").exists() or (root / "requirements.txt").exists():
        return "python"
    if (root / "go.mod").exists():
        return "go"
    if (root / "Cargo.toml").exists():
        return "rust"
    return "unknown"


def main() -> None:
    root = Path.cwd()
    notable_files = []
    for name in ["README.md", "package.json", "pyproject.toml", "requirements.txt", "go.mod", "Cargo.toml"]:
        if (root / name).exists():
            notable_files.append(name)

    result = {
        "project_name": root.name,
        "main_language": detect_language(root),
        "notable_files": notable_files,
        "description": "Project analyzed for Statuz initialization."
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
