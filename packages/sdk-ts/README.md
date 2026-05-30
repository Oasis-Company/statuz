# @statuz/sdk-ts

TypeScript SDK for the Statuz AI Agent Runtime Status Protocol.

## Overview

This SDK provides TypeScript/JavaScript utilities for working with Statuz files. It includes validation, parsing, and type definitions for the Statuz protocol.

## Installation

```bash
npm install @statuz/sdk-ts
```

## Usage

```typescript
import { loadStatuz, validateStatuz, StatuzFile } from '@statuz/sdk-ts';

// Load and validate a statuz file
const statuz = await loadStatuz('./statuz.yaml');

// Check if valid
const isValid = validateStatuz(statuz);
```

## API

### loadStatuz(path: string): Promise\<StatuzFile\>

Loads and parses a statuz file from the given path.

### validateStatuz(data: unknown): boolean

Validates data against the Statuz schema.

### parseStatuz(content: string): StatuzFile

Parses a YAML string into a StatuzFile object.

## License

Apache-2.0
