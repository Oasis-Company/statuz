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

### 9. Test Pending Actions

```bash
# Create a pending action (agent → human task assignment)
npm run dev -- pending-actions add \
  --title "Run npm install in packages/cli" \
  --description "Install dependencies for CLI build" \
  --assigned-to human \
  --priority high

**Expected Result:** pa-001 is created and saved to default `.statuz/pending-actions.yaml

# List all pending actions
npm run dev -- pending-actions list

**Expected Result:** Shows table with pa-001 in PENDING status.

# Update status (human → agent signal)
npm run dev -- pending-actions update-status pa-001 --status in_progress

# Resolve the action (human confirms completion)
npm run dev -- pending-actions resolve pa-001 --status done --outcome "npm install succeeded, 0 vulnerabilities" --resolved-by "tester"

# Verify final state
npm run dev -- pending-actions list

**Expected Result:** pa-001 marked as DONE with resolution metadata.

# Validate the file
npm run dev -- pending-actions validate

**Expected Result:** File validates successfully against schema.

### 10. Test Short Alias

```bash
# The short form "pa" works identically to "pending-actions"
npm run dev -- pa list

# Short form also works for add, show, update-status, resolve, remove, validate
npm run dev -- pa add --title "Quick test action" --assigned-to human --priority medium
```

## Cleanup (Optional)

```bash
rm -rf smoke-test .statuz
```

## All Tests Passed?

If all steps execute without errors and produce the expected output, the implementation is verified.

## Feature: Pending Actions (agent ↔ human task tracking) is complete.
