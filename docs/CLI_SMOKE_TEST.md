# Statuz CLI Smoke Test

This document describes the manual verification steps for the Statuz CLI in Phase 1.

## Prerequisites

- Node.js 20+
- npm
- Clone of the statuz repository

## Test Steps

### 1. Install Dependencies

```bash
cd packages/cli
npm install
```

**Expected Result:** Dependencies install successfully without errors.

### 2. Build the CLI

```bash
npm run build
```

**Expected Result:** TypeScript compilation succeeds with no errors.

### 3. Validate Basic Example

```bash
npm run validate:example
```

**Expected Result:** 
```
Valid Statuz file: <path>/examples/basic/statuz.yaml
```

### 4. Test `statuz validate` on Multiple Examples

```bash
npm run dev -- validate ../../examples/multi-agent/statuz.yaml
npm run dev -- validate ../../examples/muserock/statuz.yaml
```

**Expected Result:** Both files validate successfully.

### 5. Test `statuz resume`

```bash
npm run dev -- resume ../../examples/basic/statuz.yaml
```

**Expected Result:**
```
=== Statuz Resume ===
Agent:    dev-agent
Project:  example-project
Org:      Oasis Company
Env:      local-dev

Status:   in_progress
Stage:    implementation
Task:     add Statuz support to the project
Last CP:  drafted the first status schema
Next:     implement CLI validation
```

### 6. Test `statuz init`

```bash
npm run dev -- init --agent smoke-test-agent --project smoke-test-project --out smoke-test/statuz.yaml
```

**Expected Result:** File `smoke-test/statuz.yaml` is created successfully.

### 7. Validate Generated File

```bash
npm run dev -- validate smoke-test/statuz.yaml
```

**Expected Result:**
```
Valid Statuz file: <path>/packages/cli/smoke-test/statuz.yaml
```

### 8. Resume from Generated File

```bash
npm run dev -- resume smoke-test/statuz.yaml
```

**Expected Result:** Shows valid resume output.

## Cleanup (Optional)

```bash
rm -rf smoke-test
```

## All Tests Passed?

If all steps execute without errors and produce the expected output, Phase 1 is complete.
