# npm Publishing Plan

**Current Version:** 0.4.1

---

## Packages to Publish

We'll publish two packages on npm:

1. **`@statuz/cli`**
   - What: The Command Line Interface
   - Path: `packages/cli/`
   - Purpose: For humans to use directly (init, validate, resume)

2. **`@statuz/sdk-typescript`**
   - What: TypeScript/JavaScript SDK
   - Path: `packages/sdk-typescript/`
   - Purpose: For programs/agents to read/write Statuz

*Potential future packages:* `@statuz/sdk-python`, `@statuz/mcp-server`

---

## Versioning Strategy

- Follow **SemVer** (`MAJOR.MINOR.PATCH`):
  - `MAJOR`: Breaking changes to the Statuz protocol
  - `MINOR`: New features (e.g., adding niche schema)
  - `PATCH`: Bug fixes, docs, non-breaking improvements

- We'll use a **single version** across all packages for consistency.

- Current version: `0.4.1` (from `packages/cli/package.json`)

---

## Package Metadata

### `@statuz/cli` (`packages/cli/package.json`)

- **name:** `@statuz/cli`
- **description:** "Statuz: AI Agent Runtime Status Protocol - CLI"
- **keywords:** ["statuz", "agent", "status", "runtime", "protocol", "ai"]
- **bin:**
  - `statuz`: `dist/cli.js`

### `@statuz/sdk-typescript` (`packages/sdk-typescript/package.json`)

- **name:** `@statuz/sdk-typescript`
- **description:** "Statuz: AI Agent Runtime Status Protocol - TypeScript SDK"
- **keywords:** ["statuz", "agent", "status", "runtime", "protocol", "ai", "sdk", "typescript"]
- **main:** `dist/index.js`
- **module:** `dist/index.esm.js`
- **types:** `dist/index.d.ts`

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

1. **Publish CLI:**
   ```bash
   cd packages/cli
   npm publish --access public
   ```

2. **Publish TypeScript SDK:**
   ```bash
   cd packages/sdk-typescript
   npm publish --access public
   ```

### Post-Publish

- [ ] Verify packages appear on npm:
  - https://www.npmjs.com/package/@statuz/cli
  - https://www.npmjs.com/package/@statuz/sdk-typescript
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
- `test/`

---

## npm Organization

We'll use the `@statuz` npm organization scope.

**Org name:** `statuz`

---
