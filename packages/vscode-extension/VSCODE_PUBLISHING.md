# VS Code Extension Publishing Guide

This document provides instructions for packaging and publishing the Statuz VS Code Extension.

## Overview

The Statuz VS Code Extension provides:
- Statuz workspace initialization
- YAML validation for Statuz and Niche protocols
- Real-time diagnostics
- Niche Explorer view
- SYN decision tracking

## Pre-requisites

- Node.js 18.x or higher
- VS Code Extension Manager (vsce)
- Git
- VS Code account for marketplace publishing

## Installation of Tools

```bash
npm install -g @vscode/vsce
```

## Development Workflow

### 1. Development Setup

```bash
cd packages/vscode-extension
npm install
npm run build
```

### 2. Testing the Extension

- Press `F5` in VS Code to open a new window with the extension loaded
- Use the Command Palette (`Ctrl+Shift+P`) to run commands:
  - `Statuz: Hello World`
  - `Statuz: Initialize Statuz`
  - `Statuz: Validate All Files`
  - `Statuz: Resume from Statuz`
  - `Statuz: Initialize Niche`

### 3. Debugging

- Set breakpoints in `src/extension.ts` or any source file
- View output in the Debug Console
- Use `console.log` statements for logging

## Packaging

### Step 1: Build the Extension

```bash
cd packages/vscode-extension
npm run build
```

### Step 2: Package with vsce

```bash
npx vsce package
```

This creates a `.vsix` file in the current directory.

### Step 3: Verify the Package

```bash
npx vsce ls --tree
```

This shows all files included in the package.

### Step 4: Install Locally for Testing

1. Open VS Code
2. Press `Ctrl+Shift+P`
3. Type "Extensions: Install from VSIX..."
4. Select the generated `.vsix` file
5. Reload VS Code

## Publishing to Marketplace

### Step 1: Create a Publisher Account

1. Go to [Azure DevOps](https://aka.ms/vscode-login)
2. Sign in with your Microsoft account
3. Create a publisher at https://marketplace.visualstudio.com/manage/publishers
4. Note your publisher name (currently: `statuz`)

### Step 2: Get Personal Access Token (PAT)

1. Go to https://dev.azure.com/_usersSettings/tokens
2. Create a new token with the following scopes:
   - **Marketing**: None
   - **Publishing**: `Manage`
   - **Extensions**: `Publish`
3. Save the token securely

### Step 3: Log in to vsce

```bash
npx vsce login statuz
```

Enter your PAT when prompted.

### Step 4: Publish the Extension

```bash
npx vsce publish
```

Or with a specific version:

```bash
npx vsce publish --patch  # or --minor, --major
```

### Step 5: Verify Publication

1. Go to your marketplace publisher page
2. Check that the extension is listed
3. Verify version number and release notes

## Version Management

The extension follows Semantic Versioning (SemVer):

- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Minor** (0.5.0 → 0.6.0): New features, backward compatible
- **Patch** (0.5.0 → 0.5.1): Bug fixes

### Version Update Commands

```bash
# Update patch version
npx vsce publish --patch

# Update minor version
npx vsce publish --minor

# Update major version
npx vsce publish --major
```

## Managing Published Extensions

### Update an Extension

```bash
npx vsce publish
```

### Unpublish an Extension

```bash
npx vsce unpublish statuz.statuz-vscode
```

### View Extension Stats

Visit the marketplace publisher page for:
- Installation count
- Rating and reviews
- Version history

## Extension Metadata

The following metadata is configured in `package.json`:

- **Name**: `statuz-vscode`
- **Publisher**: `statuz`
- **Display Name**: `Statuz`
- **Version**: `0.5.0`
- **Description**: VS Code Extension for Statuz AI Agent Runtime Status Protocol
- **Categories**: Other, AI
- **Keywords**: statuz, ai, agent, runtime, status, niche, syn

## Marketplace Assets

### Required Assets

- **Icon**: 128x128 PNG (in `resources/icon.png`)
- **Screenshots**: Recommended for better visibility (not required)
- **README**: Auto-generated from `README.md`

### Optional Assets

- **Changelog**: Can be auto-generated from git commits
- **Q&A Support**: Enable discussion forum
- **Preview Images**: Show extension in action

## Troubleshooting

### Common Issues

#### "Extension name is invalid"

- Ensure the name doesn't start with `@` and doesn't contain scope
- Use lowercase letters, numbers, and hyphens only
- Example: `statuz-vscode` (not `@statuz/vscode-extension`)

#### "Publisher not found"

- Log in with `npx vsce login <publisher>`
- Verify PAT has correct scopes

#### "Asset not found"

- Check that all required files are in the package
- Verify `package.json` paths are correct
- Run `npx vsce ls --tree` to inspect contents

#### "Package too large"

- Add unnecessary files to `.vscodeignore`
- Bundle JavaScript files using webpack or esbuild
- Remove development dependencies from production builds

## Best Practices

1. **Test Thoroughly**: Always test with a local `.vsix` before publishing
2. **Version Increment**: Update version before each publish
3. **Changelog**: Maintain a detailed changelog for users
4. **Icon Quality**: Use a professional 128x128 PNG icon
5. **Documentation**: Keep README.md comprehensive and up-to-date
6. **Dependencies**: Minimize runtime dependencies for faster loading
7. **Security**: Never commit PATs to version control

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Publish Extension

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18.x'
          
      - name: Install Dependencies
        run: |
          cd packages/vscode-extension
          npm install
          
      - name: Build Extension
        run: |
          cd packages/vscode-extension
          npm run build
          
      - name: Package Extension
        run: |
          cd packages/vscode-extension
          npx vsce package
          
      - name: Publish Extension
        env:
          VSCE_PAT: ${{ secrets.VSCE_PAT }}
        run: |
          cd packages/vscode-extension
          npx vsce publish --pat $VSCE_PAT
```

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Extension Manifest Reference](https://code.visualstudio.com/api/references/extension-manifest)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [vsce GitHub Repository](https://github.com/microsoft/vscode-vsce)

## Support

For issues or questions:
- Open an issue on GitHub
- Check the main [Statuz documentation](https://github.com/statuz/statuz)
- Review [existing marketplace extensions](https://marketplace.visualstudio.com/extensions)

---

Last updated: 2026-05-30
