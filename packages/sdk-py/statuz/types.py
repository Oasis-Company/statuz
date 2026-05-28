from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class Checkpoint(BaseModel):
    id: str
    at: str
    summary: str
    decision: Optional[str] = None
    evidence: Optional[List[str]] = None
    next_action: Optional[str] = None
    
    model_config = {"extra": "allow"}


class Identity(BaseModel):
    agent_name: str
    agent_id: Optional[str] = None
    project_name: str
    organization: Optional[str] = None
    environment: Optional[str] = None
    
    model_config = {"extra": "allow"}


class Role(BaseModel):
    name: Optional[str] = None
    responsibilities: Optional[List[str]] = None
    boundaries: Optional[List[str]] = None
    
    model_config = {"extra": "allow"}


class Goal(BaseModel):
    primary: Optional[str] = None
    secondary: Optional[List[str]] = None
    
    model_config = {"extra": "allow"}


class CurrentState(BaseModel):
    stage: Optional[str] = None
    task: Optional[str] = None
    status: str
    last_checkpoint: Optional[str] = None
    next_action: Optional[str] = None
    
    model_config = {"extra": "allow"}


class Progress(BaseModel):
    completed: Optional[List[str]] = None
    blocked_by: Optional[List[str]] = None
    open_questions: Optional[List[str]] = None
    
    model_config = {"extra": "allow"}


class AgentRelation(BaseModel):
    from_: str = Field(alias="from")
    to: str
    type: str
    
    model_config = {"extra": "allow", "populate_by_name": True}


class Relations(BaseModel):
    related_agents: Optional[List[str]] = None
    related_projects: Optional[List[str]] = None
    related_files: Optional[List[str]] = None
    related_tools: Optional[List[str]] = None
    agent_graph: Optional[List[AgentRelation]] = None
    
    model_config = {"extra": "allow"}


class Rules(BaseModel):
    should: Optional[List[str]] = None
    should_not: Optional[List[str]] = None
    
    model_config = {"extra": "allow"}


class StatuzDocument(BaseModel):
    statuz_version: str = "0.1"
    updated_at: Optional[str] = None
    identity: Identity
    role: Optional[Role] = None
    goal: Optional[Goal] = None
    current_state: CurrentState
    progress: Optional[Progress] = None
    relations: Optional[Relations] = None
    rules: Optional[Rules] = None
    checkpoints: Optional[List[Checkpoint]] = None
    
    model_config = {"extra": "allow"}


class ValidationResult(BaseModel):
    valid: bool
    errors: Optional[List[Dict[str, str]]] = None


StatusValue = str
StageValue = str
