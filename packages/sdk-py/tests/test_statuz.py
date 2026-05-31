import os
import shutil
import pytest
from statuz import Statuz


@pytest.fixture(autouse=True)
def cleanup():
    yield
    if os.path.exists("test-statuz.yaml"):
        os.remove("test-statuz.yaml")
    if os.path.exists(".statuz"):
        agents_dir = os.path.join(".statuz", "agents")
        if os.path.exists(agents_dir):
            for file in os.listdir(agents_dir):
                path = os.path.join(agents_dir, file)
                if os.path.isfile(path):
                    os.remove(path)
            os.rmdir(agents_dir)
        os.rmdir(".statuz")


def test_create_statuz():
    statuz = Statuz.create("test-agent", "test-project")
    assert statuz.identity.agent_name == "test-agent"
    assert statuz.identity.project_name == "test-project"
    assert statuz.current_state.status == "idle"


def test_write_statuz():
    statuz = Statuz.create("test-agent", "test-project")
    statuz.write("test-statuz.yaml")
    assert os.path.exists("test-statuz.yaml")


def test_read_statuz():
    statuz = Statuz.create("test-agent", "test-project")
    statuz.write("test-statuz.yaml")
    
    read_statuz = Statuz.read("test-statuz.yaml")
    assert read_statuz.identity.agent_name == "test-agent"
    assert read_statuz.identity.project_name == "test-project"


def test_validate_valid():
    statuz = Statuz.create("test-agent", "test-project")
    result = statuz.validate()
    assert result.valid is True


def test_append_checkpoint():
    statuz = Statuz.create("test-agent", "test-project")
    
    cp1 = statuz.append_checkpoint("First checkpoint", "Do next thing")
    assert cp1.id == "cp-002"
    assert cp1.summary == "First checkpoint"
    assert cp1.next_action == "Do next thing"
    
    cp2 = statuz.append_checkpoint("Second checkpoint")
    assert cp2.id == "cp-003"
    
    assert len(statuz.checkpoints) == 3


def test_for_agent_create():
    statuz = Statuz.for_agent("test-agent", "test-project")
    assert statuz.identity.agent_name == "test-agent"


def test_for_agent_read():
    Statuz.for_agent("test-agent", "test-project")
    statuz = Statuz.for_agent("test-agent", "test-project")
    assert statuz.identity.agent_name == "test-agent"


def test_different_agents_separate():
    statuz1 = Statuz.for_agent("test-agent", "project-a")
    statuz2 = Statuz.for_agent("another-agent", "project-b")
    
    assert statuz1.identity.agent_name == "test-agent"
    assert statuz2.identity.agent_name == "another-agent"
    assert statuz1.identity.project_name == "project-a"
    assert statuz2.identity.project_name == "project-b"