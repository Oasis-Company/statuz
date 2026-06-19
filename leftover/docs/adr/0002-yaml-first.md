# ADR 0002: YAML first, JSON Schema compatible

Date: 2026-05-27  
Status: Accepted

## Context

Statuz must be readable by humans and usable by tools.

## Decision

Statuz 0.1 recommends YAML for project files and JSON Schema for validation.

## Consequences

Humans can edit `.statuz/statuz.yaml` directly.

Tools can parse YAML into JSON and validate against `spec/statuz.schema.json`.

JSON-native implementations are allowed.
