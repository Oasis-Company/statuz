#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

try:
    import yaml
except ImportError as exc:
    raise SystemExit("Please install PyYAML: pip install pyyaml") from exc


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate .statuz folder")
    parser.add_argument("--project", default=Path.cwd().name)
    parser.add_argument("--agent", default="default-agent")
    parser.add_argument("--analysis-json", default=None)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    root = Path.cwd()
    statuz_dir = root / ".statuz"
    status_path = statuz_dir / "statuz.yaml"

    if status_path.exists() and not args.force:
        raise SystemExit(f"Refusing to overwrite existing {status_path}. Use --force to overwrite.")

    analysis = {}
    if args.analysis_json:
        analysis = json.loads(Path(args.analysis_json).read_text(encoding="utf8"))

    statuz_dir.mkdir(parents=True, exist_ok=True)
    (statuz_dir / "agents").mkdir(exist_ok=True)

    doc = {
        "statuz_version": "0.1",
        "updated_at": now(),
        "identity": {
            "agent_name": args.agent,
            "project_name": args.project,
            "environment": "local-dev"
        },
        "role": {
            "name": "assistant-agent",
            "responsibilities": ["help the user make progress"],
            "boundaries": ["do not store secrets in Statuz"]
        },
        "current_state": {
            "stage": "initialization",
            "task": "initialize Statuz",
            "status": "idle",
            "last_checkpoint": "Statuz folder created",
            "next_action": "define the current task"
        },
        "progress": {
            "completed": ["created .statuz folder"],
            "blocked_by": [],
            "open_questions": []
        },
        "relations": {
            "related_agents": [],
            "related_files": analysis.get("notable_files", []),
            "related_tools": []
        },
        "rules": {
            "should": ["read Statuz at session start", "append checkpoint after meaningful progress"],
            "should_not": ["store secrets", "store full chat transcripts"]
        },
        "checkpoints": [
            {
                "id": "cp-001",
                "at": now(),
                "summary": "Initialized Statuz.",
                "next_action": "Define current task and next action."
            }
        ]
    }

    status_path.write_text(yaml.safe_dump(doc, sort_keys=False, allow_unicode=True), encoding="utf8")
    (statuz_dir / "checkpoints.log").write_text("", encoding="utf8")
    agent_path = statuz_dir / "agents" / f"{args.agent}.yaml"
    agent_path.write_text(yaml.safe_dump(doc, sort_keys=False, allow_unicode=True), encoding="utf8")

    print(f"Created {status_path}")
    print(f"Created {agent_path}")


if __name__ == "__main__":
    main()
