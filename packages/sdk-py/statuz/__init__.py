import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

import yaml
from jsonschema import validate, ValidationError

from .types import (
    StatuzDocument,
    Checkpoint,
    Identity,
    CurrentState,
    Progress,
    Relations,
    Rules,
    ValidationResult,
)


class Statuz:
    def __init__(self, data: StatuzDocument):
        self._data = data

    @classmethod
    def read(cls, file_path: str) -> "Statuz":
        full_path = os.path.abspath(file_path)
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"File not found: {full_path}")
        
        try:
            with open(full_path, "r", encoding="utf-8") as f:
                raw = f.read()
        except Exception as e:
            raise IOError(f"Could not read file: {full_path}") from e
        
        try:
            data_dict = yaml.safe_load(raw)
        except yaml.YAMLError as e:
            raise ValueError(f"Invalid YAML in file: {full_path}\n  {str(e)}") from e
        
        try:
            data = StatuzDocument(**data_dict)
        except Exception as e:
            raise ValueError(f"Invalid Statuz document: {str(e)}") from e
        
        return cls(data)

    @classmethod
    def validate(cls, file_path: str) -> ValidationResult:
        full_path = os.path.abspath(file_path)
        if not os.path.exists(full_path):
            return ValidationResult(
                valid=False,
                errors=[{"path": "(root)", "message": f"File not found: {full_path}"}]
            )
        
        try:
            with open(full_path, "r", encoding="utf-8") as f:
                raw = f.read()
        except Exception:
            return ValidationResult(
                valid=False,
                errors=[{"path": "(root)", "message": f"Could not read file: {full_path}"}]
            )
        
        try:
            doc = yaml.safe_load(raw)
        except yaml.YAMLError as e:
            return ValidationResult(
                valid=False,
                errors=[{"path": "(root)", "message": f"Invalid YAML: {str(e)}"}]
            )
        
        return cls._validate_document(doc)

    @classmethod
    def _validate_document(cls, doc: Any) -> ValidationResult:
        try:
            schema = cls._load_schema()
            validate(instance=doc, schema=schema)
            return ValidationResult(valid=True)
        except ValidationError as e:
            return ValidationResult(
                valid=False,
                errors=[{"path": e.json_path or "(root)", "message": e.message}]
            )
        except Exception as e:
            return ValidationResult(
                valid=False,
                errors=[{"path": "(root)", "message": f"Validation error: {str(e)}"}]
            )

    def validate(self) -> ValidationResult:
        return self._validate_document(self._data.model_dump())

    @classmethod
    def create(cls, agent_name: str, project_name: str) -> "Statuz":
        now = datetime.now().isoformat()
        data = StatuzDocument(
            statuz_version="0.1",
            updated_at=now,
            identity=Identity(
                agent_name=agent_name,
                project_name=project_name,
                environment="local-dev"
            ),
            current_state=CurrentState(
                stage="initialization",
                task="initialize Statuz",
                status="idle",
                last_checkpoint="Statuz file created",
                next_action="define the agent's current goal"
            ),
            progress=Progress(
                completed=["created initial Statuz file"],
                blocked_by=[],
                open_questions=[]
            ),
            relations=Relations(
                related_agents=[],
                related_projects=[],
                related_files=[],
                related_tools=[]
            ),
            rules=Rules(
                should=[
                    "read Statuz at session start",
                    "write checkpoint after meaningful progress"
                ],
                should_not=[
                    "store API keys, tokens, passwords, or secrets"
                ]
            ),
            checkpoints=[
                Checkpoint(
                    id="cp-001",
                    at=now,
                    summary="Initialized Statuz.",
                    next_action="Define current task and next action."
                )
            ]
        )
        return cls(data)

    @classmethod
    def for_agent(cls, agent_name: str, project_name: str) -> "Statuz":
        default_path = f".statuz/{agent_name}.yaml"
        if os.path.exists(os.path.abspath(default_path)):
            return cls.read(default_path)
        statuz = cls.create(agent_name, project_name)
        statuz.write(default_path)
        return statuz

    def write(self, file_path: str) -> None:
        full_path = os.path.abspath(file_path)
        out_dir = os.path.dirname(full_path)
        
        try:
            os.makedirs(out_dir, exist_ok=True)
        except Exception as e:
            raise IOError(f"Could not create directory: {out_dir}") from e
        
        self._data.updated_at = datetime.now().isoformat()
        
        try:
            with open(full_path, "w", encoding="utf-8") as f:
                yaml.dump(self._data.model_dump(exclude_none=True), f, sort_keys=False)
        except Exception as e:
            raise IOError(f"Could not write file: {full_path}") from e

    def append_checkpoint(self, summary: str, next_action: Optional[str] = None) -> Checkpoint:
        checkpoints = self._data.checkpoints or []
        next_id = f"cp-{len(checkpoints) + 1:03d}"
        
        checkpoint = Checkpoint(
            id=next_id,
            at=datetime.now().isoformat(),
            summary=summary,
            next_action=next_action
        )
        
        if self._data.checkpoints is None:
            self._data.checkpoints = []
        self._data.checkpoints.append(checkpoint)
        
        return checkpoint

    def get_document(self) -> StatuzDocument:
        return self._data.model_copy()

    @property
    def identity(self) -> Identity:
        return self._data.identity

    @property
    def current_state(self) -> CurrentState:
        return self._data.current_state

    @current_state.setter
    def current_state(self, state: CurrentState) -> None:
        self._data.current_state = state

    @property
    def checkpoints(self) -> List[Checkpoint]:
        return self._data.checkpoints or []

    @staticmethod
    def _load_schema() -> Dict[str, Any]:
        candidates = [
            os.path.join(os.getcwd(), "spec/statuz.schema.json"),
            os.path.join(os.path.dirname(__file__), "../../../spec/statuz.schema.json"),
            os.path.join(os.path.dirname(__file__), "../../../../spec/statuz.schema.json")
        ]
        for candidate in candidates:
            if os.path.exists(candidate):
                try:
                    with open(candidate, "r", encoding="utf-8") as f:
                        return json.load(f)
                except Exception:
                    continue
        raise FileNotFoundError(
            "Could not find statuz.schema.json. Try running from the project root."
        )


__all__ = [
    "Statuz",
    "StatuzDocument",
    "Checkpoint",
    "Identity",
    "CurrentState",
    "ValidationResult",
]
