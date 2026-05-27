# Statuz Bootstrap Schema Reference

The generated `.statuz/statuz.yaml` should follow Statuz 0.1.

Required:

```yaml
statuz_version: "0.1"
identity:
  agent_name: default-agent
  project_name: project-name
current_state:
  status: idle
```

Recommended:

- `role`
- `progress`
- `relations`
- `rules`
- `checkpoints`
