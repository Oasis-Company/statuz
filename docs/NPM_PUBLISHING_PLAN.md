# npm Publishing Plan

**Current Version:** 0.5.0

---

## Packages to Publish

We'll publish three packages on npm:

1. **`@statuz/sdk-ts`**
   - What: TypeScript/JavaScript SDK
   - Path: `packages/sdk-ts/`
   - Purpose: For programs/agents to read/write Statuz files
   - Dependencies: None

2. **`@statuz/cli`**
   - What: The Command Line Interface
   - Path: `packages/cli/`
   - Purpose: For humans to use directly (init, validate, resume)
   - Dependencies: `@statuz/sdk-ts`

3. **`@statuz/mcp-server`**
   - What: MCP Server for Model Context Protocol
   - Path: `packages/mcp-server/`
   - Purpose: Integration with MCP-compatible tools
   - Dependencies: `@statuz/sdk-ts`

*Potential future packages:* `@statuz/sdk-python`

---

## Versioning Strategy

- Follow **SemVer** (`MAJOR.MINOR.PATCH`):
  - `MAJOR`: Breaking changes to the Statuz protocol
  - `MINOR`: New features (e.g., adding niche schema)
  - `PATCH`: Bug fixes, docs, non-breaking improvements

- We'll use a **single version** across all packages for consistency.

- Current version: `0.5.0` (from `packages/sdk-ts/package.json`)

---

## Package Metadata

### `@statuz/sdk-ts` (`packages/sdk-ts/package.json`)

- **name:** `@statuz/sdk-ts`
- **description:** "TypeScript SDK for the Statuz AI Agent Runtime Status Protocol"
- **keywords:** ["statuz", "ai-agent", "agent-status", "runtime-status", "agent-protocol", "sdk", "typescript"]
- **main:** `dist/index.js`
- **types:** `dist/index.d.ts`

### `@statuz/cli` (`packages/cli/package.json`)

- **name:** `@statuz/cli`
- **description:** "CLI for the Statuz AI Agent Runtime Status Protocol"
- **keywords:** ["statuz", "ai-agent", "agent-status", "runtime-status", "agent-protocol", "cli"]
- **bin:**
  - `statuz`: `dist/index.js`

### `@statuz/mcp-server` (`packages/mcp-server/package.json`)

- **name:** `@statuz/mcp-server`
- **description:** "MCP Server for the Statuz AI Agent Runtime Status Protocol"
- **keywords:** ["statuz", "ai-agent", "agent-status", "runtime-status", "agent-protocol", "mcp", "model-context-protocol"]
- **main:** `dist/index.js`
- **types:** `dist/index.d.ts`
- **bin:**
  - `statuz-mcp`: `dist/index.js`

---

## Publishing Checklist

### Pre-Publish

- [ ] **Clean build:** `npm run clean && npm run build` in both packages
- [ ] **Tests pass:** `npm test` (in both packages)
- [ ] **Smoke test:** Run CLI on examples to verify
- [ ] **Changelog updated:** Update `CHANGELOG.md`
- [ ] **Git tag:** Create and push git tag (e.g., `v0.4.1`)
- [ ] **npm login:** Ensure you're logged in to npm with correct permissions

### Publish Steps

**Important:** Packages must be published in this order due to dependencies:

1. **Publish SDK TypeScript (no dependencies):**
   ```bash
   cd packages/sdk-ts
   npm publish --access public
   ```

2. **Publish CLI (depends on sdk-ts):**
   ```bash
   cd packages/cli
   npm publish --access public
   ```

3. **Publish MCP Server (depends on sdk-ts):**
   ```bash
   cd packages/mcp-server
   npm publish --access public
   ```

### Post-Publish

- [ ] Verify packages appear on npm:
  - https://www.npmjs.com/package/@statuz/sdk-ts
  - https://www.npmjs.com/package/@statuz/cli
  - https://www.npmjs.com/package/@statuz/mcp-server
- [ ] Update GitHub Release with version and changelog
- [ ] Update README to point to new packages
- [ ] Notify users (if applicable)

---

## Files to Include/Exclude

Each package should have a `.npmignore` or use the `files` field in `package.json`.

**Include:**
- `dist/` (compiled output)
- `README.md`
- `LICENSE`

**Exclude:**
- `src/` (source files, not needed)
- `node_modules/`
- `*.tsbuildinfo`
- `.DS_Store`
- `*.log`
- `tests/`
- `*.test.js`
- `*.spec.js`

---

## npm Organization

We'll use the `@statuz` npm organization scope.

**Org name:** `statuz`

---

## Publishing Status

**Last Updated:** 2026-05-30

**Current Version:** 0.5.0

**Publishing Status:** Ready to publish (credentials not configured)

**Next Steps:**
1. Configure npm credentials (see [docs/INSTRUCTIONS.md](./INSTRUCTIONS.md))
2. Build all packages
3. Publish in order: sdk-ts → cli → mcp-server
4. Verify packages on npmjs.com

---
