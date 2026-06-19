# Statuz npm Publishing Instructions

This document provides step-by-step instructions for publishing Statuz packages to the npm registry.

## Prerequisites

### 1. npm Account Setup

1. **Create an npm account** if you don't have one:
   - Visit [npmjs.com](https://www.npmjs.com/)
   - Sign up for a free account

2. **Join the `@statuz` organization**:
   - Request access from an organization admin
   - Or create your own organization named `statuz` on npm

3. **Enable 2FA** (recommended for publishing):
   - Go to Account Settings > Security
   - Enable Two-Factor Authentication

### 2. npm CLI Authentication

**Option A: Using npm login (interactive)**

```bash
npm login
# Enter username, password, and email when prompted
```

**Option B: Using npm token (recommended for CI/CD)**

1. Generate an npm access token:
   - Go to [npmjs.com/settings/tokens](https://www.npmjs.com/settings/tokens)
   - Click "Generate New Token" > "Classic Token"
   - Select "Automation" type for CI/CD
   - Copy the generated token

2. Configure the token in your environment:
   ```bash
   # Windows (PowerShell)
   $env:NPM_TOKEN = "your-npm-token-here"
   
   # Linux/macOS
   export NPM_TOKEN="your-npm-token-here"
   ```

3. Add to `.npmrc` in the project root:
   ```ini
   //registry.npmjs.org/:_authToken=${NPM_TOKEN}
   ```

## Package Publishing Order

Packages must be published in this specific order due to dependencies:

1. **`@statuz/sdk-ts`** (TypeScript SDK)
   - No dependencies on other @statuz packages
   - Other packages depend on this

2. **`@statuz/cli`** (Command Line Interface)
   - Depends on `@statuz/sdk-ts`

3. **`@statuz/mcp-server`** (MCP Server)
   - Depends on both `@statuz/sdk-ts`

## Publishing Steps

### Step 1: Update Version

Before publishing, update the version in all three packages. Use semantic versioning:

```bash
# Update version in all packages (must be same version)
npm version 0.5.0
```

Or manually update each `package.json`:

```json
// packages/sdk-ts/package.json
"version": "0.5.0"

// packages/cli/package.json
"version": "0.5.0"

// packages/mcp-server/package.json
"version": "0.5.0"
```

### Step 2: Build All Packages

```bash
# Build SDK TypeScript
cd packages/sdk-ts
npm install
npm run build

# Build CLI
cd packages/cli
npm install
npm run build

# Build MCP Server
cd packages/mcp-server
npm install
npm run build
```

### Step 3: Run Tests

```bash
# Test SDK
cd packages/sdk-ts
npm test

# Test MCP Server
cd packages/mcp-server
npm test
```

### Step 4: Validate Examples

```bash
# Validate CLI works
cd packages/cli
npm run validate:example
```

### Step 5: Publish Packages

**Publish SDK TypeScript:**

```bash
cd packages/sdk-ts
npm publish --access public
```

**Publish CLI:**

```bash
cd packages/cli
npm publish --access public
```

**Publish MCP Server:**

```bash
cd packages/mcp-server
npm publish --access public
```

### Step 6: Create Git Tag

```bash
git tag -a v0.5.0 -m "Release version 0.5.0"
git push origin v0.5.0
```

## Automated Publishing Script

You can use this script to publish all packages:

```bash
#!/bin/bash

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: ./publish.sh <version>"
  echo "Example: ./publish.sh 0.5.0"
  exit 1
fi

# Update versions
cd packages/sdk-ts && npm version $VERSION --no-git-tag-version && cd ../..
cd packages/cli && npm version $VERSION --no-git-tag-version && cd ../..
cd packages/mcp-server && npm version $VERSION --no-git-tag-version && cd ../..

# Build all packages
cd packages/sdk-ts && npm run build && cd ../..
cd packages/cli && npm run build && cd ../..
cd packages/mcp-server && npm run build && cd ../..

# Publish in order
cd packages/sdk-ts && npm publish --access public && cd ../..
cd packages/cli && npm publish --access public && cd ../..
cd packages/mcp-server && npm publish --access public && cd ../..

# Create git tag
git tag -a v$VERSION -m "Release version $VERSION"
git push origin v$VERSION

echo "Publishing complete!"
```

Save as `scripts/publish.sh` and run:

```bash
chmod +x scripts/publish.sh
./publish.sh 0.5.0
```

## Verification

After publishing, verify the packages are accessible:

- **@statuz/sdk-ts**: https://www.npmjs.com/package/@statuz/sdk-ts
- **@statuz/cli**: https://www.npmjs.com/package/@statuz/cli
- **@statuz/mcp-server**: https://www.npmjs.com/package/@statuz/mcp-server

You can also verify via CLI:

```bash
npm view @statuz/sdk-ts
npm view @statuz/cli
npm view @statuz/mcp-server
```

## Common Issues

### 1. "You do not have permission to publish"

- Ensure you're a member of the `@statuz` npm organization
- Check your npm account permissions
- Contact organization admin for access

### 2. "This package name is already taken"

- Ensure the organization scope is correct (`@statuz/`)
- Check if package already exists under your account
- Contact previous owner if needed

### 3. "Cannot find module '@statuz/sdk-ts'"

- Ensure SDK was published first
- Wait a few minutes for npm registry to update
- Check package version matches in dependencies

### 4. Authentication fails

- Verify npm token is correct
- Ensure token hasn't expired
- Check `.npmrc` configuration
- Try `npm logout` and `npm login` again

## Post-Publish Checklist

- [ ] Verify all packages on npmjs.com
- [ ] Test installing packages in a new directory
- [ ] Update CHANGELOG.md
- [ ] Create GitHub release
- [ ] Update documentation if needed

## Version Numbering

Follow semantic versioning (SemVer):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backward compatible
- **PATCH** (0.0.1): Bug fixes, backward compatible

Current version: **0.5.0**

## Additional Resources

- [npm Publishing Documentation](https://docs.npmjs.com/cli/v8/commands/npm-publish)
- [Managing Package Access](https://docs.npmjs.com/package-access)
- [npm Scopes](https://docs.npmjs.com/using-npm/scope)
