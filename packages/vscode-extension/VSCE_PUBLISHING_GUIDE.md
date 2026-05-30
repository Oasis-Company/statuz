# Statuz VS Code Extension Publishing Guide

This comprehensive guide covers publishing the Statuz VS Code Extension to both **Open VSX** and **VS Code Marketplace**.

## Extension Overview

- **Name**: statuz-vscode
- **Version**: 0.5.0
- **Publisher**: statuz
- **Display Name**: Statuz
- **VSIX File**: statuz-vscode-0.5.0.vsix

## Current Status

✅ **VSIX file ready**: `packages/vscode-extension/statuz-vscode-0.5.0.vsix`
✅ **Build successful**: TypeScript compilation passed
✅ **Package validation**: All required files included

## Prerequisites

### Required Tools

1. **Node.js**: 18.x or higher
2. **Git**: Latest version
3. **vsce**: Microsoft VS Code Extension Manager (v3.9.1 installed)
4. **ovsx**: Open VSX CLI Client (v1.0.0 available)

### Optional Tools

- **Visual Studio Code**: Latest version for local testing
- **Azure DevOps**: For VS Code Marketplace publishing

## Quick Start

### If You Have Credentials

#### Publishing to Open VSX (Recommended First)

```bash
cd packages/vscode-extension

# Publish the pre-built VSIX
npx ovsx publish statuz-vscode-0.5.0.vsix --pat <your-token>

# Or use environment variable
export OVSX_PAT=<your-token>
npx ovsx publish statuz-vscode-0.5.0.vsix
```

#### Publishing to VS Code Marketplace

```bash
cd packages/vscode-extension

# Publish with vsce
npx vsce publish --pat <your-personal-access-token>

# Or login first, then publish
npx vsce login statuz
npx vsce publish
```

### If You Don't Have Credentials

Follow the step-by-step guides below for each marketplace.

---

## Part 1: Publishing to Open VSX (Recommended)

Open VSX is an open-source alternative marketplace that works with VS Code, VSCodium, and other compatible editors.

### Step 1: Create Open VSX Account

1. Visit [open-vsx.org](https://open-vsx.org)
2. Click **"Register"** to create an account
3. Verify your email address

### Step 2: Get Personal Access Token

1. Log in to [open-vsx.org](https://open-vsx.org)
2. Go to **"Settings"** → **"Personal Access Tokens"**
3. Click **"Create Token"**
4. Enter a descriptive name (e.g., "VS Code Extension Publishing")
5. Set permissions:
   - ✅ **Extension: Read & Write**
6. Click **"Create"**
7. **Important**: Copy and save the token securely - it won't be shown again!

### Step 3: Save Token Securely

**Option A: Environment Variable (Recommended for local development)**

```bash
# Windows (PowerShell)
$env:OVSX_PAT = "your-token-here"

# Windows (Command Prompt)
set OVSX_PAT=your-token-here

# macOS/Linux
export OVSX_PAT=your-token-here
```

**Option B: GitHub Secrets (Recommended for CI/CD)**

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Name: `OVSX_PAT`
5. Value: Paste your token
6. Click **"Add secret"**

### Step 4: Publish Extension

#### Option A: Using Pre-built VSIX

```bash
cd packages/vscode-extension
npx ovsx publish statuz-vscode-0.5.0.vsix --pat $env:OVSX_PAT
```

#### Option B: Build and Package First

```bash
cd packages/vscode-extension

# Install dependencies
npm install

# Build TypeScript
npm run build

# Package extension
npx vsce package

# Publish to Open VSX
npx ovsx publish statuz-vscode-0.5.0.vsix --pat $env:OVSX_PAT
```

### Step 5: Verify Publication

1. Go to [open-vsx.org](https://open-vsx.org)
2. Search for **"statuz"**
3. Your extension should appear with version 0.5.0

### Open VSX Command Reference

```bash
# Publish extension
npx ovsx publish <file.vsix> --pat <token>

# Unpublish extension
npx ovsx unpublish statuz.statuz-vscode --pat <token>

# Get extension info
npx ovsx get statuz.statuz-vscode

# List all extensions for a namespace
npx ovsx list statuz

# Create a new namespace (if needed)
npx ovsx create-namespace statuz --pat <token>
```

---

## Part 2: Publishing to VS Code Marketplace

The VS Code Marketplace is Microsoft's official marketplace for VS Code extensions.

### Step 1: Create Microsoft/Azure DevOps Account

1. Go to [Azure DevOps](https://dev.azure.com)
2. Sign in with your Microsoft account or create one
3. Create a new organization or use existing one

### Step 2: Create Publisher Account

1. Go to [Marketplace Publisher Management](https://marketplace.visualstudio.com/manage/publishers)
2. Click **"Create"**
3. Fill in details:
   - **Publisher Name**: `statuz` (must match package.json)
   - **Display Name**: `Statuz`
   - **Email**: Your email address
4. Accept the marketplace terms
5. Click **Create**

### Step 3: Get Personal Access Token (PAT)

1. Go to [Azure DevOps Personal Access Tokens](https://dev.azure.com/_usersSettings/tokens)
2. Click **"New Token"**
3. Configure:
   - **Name**: "VS Code Extension Publishing"
   - **Organization**: Select your organization
   - **Expiration**: Set to desired period (90 days recommended)
   - **Scopes**: Click **"Show all scopes"** and select:
     - ✅ **Marketing**: None
     - ✅ **Publishing**: **Manage**
     - ✅ **Extensions**: **Publish**
4. Click **"Create"**
5. **Important**: Copy and save the token immediately - it won't be shown again!

### Step 4: Save Token Securely

**Option A: Environment Variable (Recommended for local development)**

```bash
# Windows (PowerShell)
$env:VSCE_PAT = "your-pat-here"

# Windows (Command Prompt)
set VSCE_PAT=your-pat-here

# macOS/Linux
export VSCE_PAT=your-pat-here
```

**Option B: GitHub Secrets (Recommended for CI/CD)**

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Name: `VSCE_PAT`
5. Value: Paste your PAT
6. Click **"Add secret"**

### Step 5: Authenticate with vsce

```bash
cd packages/vscode-extension

# Interactive login (will prompt for token)
npx vsce login statuz

# Or non-interactive with token
echo $env:VSCE_PAT | npx vsce login statuz --password-stdin
```

### Step 6: Publish Extension

#### Option A: Direct Publish (Recommended)

```bash
cd packages/vscode-extension
npx vsce publish --pat $env:VSCE_PAT
```

#### Option B: Build, Package, then Publish

```bash
cd packages/vscode-extension

# Install dependencies
npm install

# Build TypeScript
npm run build

# Package extension
npx vsce package

# Publish packaged extension
npx vsce publish --pat $env:VSCE_PAT
```

#### Option C: Publish with Version Increment

```bash
# Update patch version (0.5.0 → 0.5.1)
npx vsce publish --patch --pat $env:VSCE_PAT

# Update minor version (0.5.0 → 0.6.0)
npx vsce publish --minor --pat $env:VSCE_PAT

# Update major version (0.5.0 → 1.0.0)
npx vsce publish --major --pat $env:VSCE_PAT
```

### Step 7: Verify Publication

1. Go to your publisher page: `https://marketplace.visualstudio.com/items?itemName=statuz.statuz-vscode`
2. Check extension details:
   - Version number
   - Description
   - Categories
   - Installation count
3. Test installation in VS Code

### VS Code Marketplace Command Reference

```bash
# Publish extension
npx vsce publish --pat <token>

# Publish with version bump
npx vsce publish --patch --pat <token>
npx vsce publish --minor --pat <token>
npx vsce publish --major --pat <token>

# Unpublish extension
npx vsce unpublish statuz.statuz-vscode --pat <token>

# Login to publisher
npx vsce login statuz

# Show publisher information
npx vsce show statuz.statuz-vscode

# List available extensions
npx vsce list
```

---

## Part 3: Publishing to Both Marketplaces (Recommended Strategy)

For maximum reach, publish to both Open VSX and VS Code Marketplace.

### Step 1: Get Credentials for Both

1. Open VSX PAT from open-vsx.org
2. VS Code Marketplace PAT from Azure DevOps

### Step 2: Create Environment Variables

```bash
# Windows (PowerShell)
$env:OVSX_PAT = "your-ovsx-token"
$env:VSCE_PAT = "your-vsce-pat"

# macOS/Linux
export OVSX_PAT="your-ovsx-token"
export VSCE_PAT="your-vsce-pat"
```

### Step 3: Publish to Both

```bash
cd packages/vscode-extension

# Publish to Open VSX first
npx ovsx publish statuz-vscode-0.5.0.vsix --pat $env:OVSX_PAT

# Then publish to VS Code Marketplace
npx vsce publish --pat $env:VSCE_PAT
```

### Step 4: Verify Both Publications

- Open VSX: https://open-vsx.org/extension/statuz/statuz-vscode
- Marketplace: https://marketplace.visualstudio.com/items?itemName=statuz.statuz-vscode

---

## Part 4: CI/CD with GitHub Actions

### Complete Workflow Example

Create `.github/workflows/publish-extension.yml`:

```yaml
name: Publish VS Code Extension

on:
  push:
    tags:
      - 'v*.*.*'  # Trigger on version tags (e.g., v0.5.0)

jobs:
  publish:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: |
          cd packages/vscode-extension
          npm ci
          
      - name: Build extension
        run: |
          cd packages/vscode-extension
          npm run build
          
      - name: Package extension
        run: |
          cd packages/vscode-extension
          npx vsce package
          
      - name: Publish to Open VSX
        if: env.OVSX_PAT != ''
        run: |
          cd packages/vscode-extension
          npx ovsx publish statuz-vscode-${{ github.ref_name }}.vsix --pat ${{ env.OVSX_PAT }}
        env:
          OVSX_PAT: ${{ secrets.OVSX_PAT }}
          
      - name: Publish to VS Code Marketplace
        if: env.VSCE_PAT != ''
        run: |
          cd packages/vscode-extension
          npx vsce publish --pat ${{ env.VSCE_PAT }}
        env:
          VSCE_PAT: ${{ secrets.VSCE_PAT }}
```

### Setup GitHub Secrets

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:
   - `OVSX_PAT`: Your Open VSX personal access token
   - `VSCE_PAT`: Your VS Code Marketplace personal access token

### Triggering Publication

```bash
# Create and push a version tag
git tag v0.5.0
git push origin v0.5.0
```

---

## Part 5: Managing Published Extensions

### Update an Extension

```bash
# Update version in package.json
# Edit: "version": "0.5.1"

# Rebuild
npm run build

# Repackage
npx vsce package

# Publish to both marketplaces
npx ovsx publish statuz-vscode-0.5.1.vsix --pat $env:OVSX_PAT
npx vsce publish --pat $env:VSCE_PAT
```

### Unpublish an Extension

#### From Open VSX

```bash
npx ovsx unpublish statuz.statuz-vscode --pat $env:OVSX_PAT
```

#### From VS Code Marketplace

```bash
npx vsce unpublish statuz.statuz-vscode --pat $env:VSCE_PAT
```

**Warning**: Unpublishing removes the extension permanently from the marketplace!

### Deprecate an Extension (Recommended Instead of Unpublishing)

Instead of unpublishing, mark as deprecated to maintain URLs:

1. Log in to marketplace management page
2. Select your extension
3. Click **"Edit"**
4. Check **"This extension is deprecated"**
5. Add deprecation message pointing users to alternatives

---

## Part 6: Extension Metadata

### Current Configuration

Located in `packages/vscode-extension/package.json`:

```json
{
  "name": "statuz-vscode",
  "version": "0.5.0",
  "publisher": "statuz",
  "displayName": "Statuz",
  "description": "VS Code Extension for Statuz AI Agent Runtime Status Protocol",
  "categories": ["Other", "AI"],
  "keywords": ["statuz", "ai", "agent", "runtime", "status", "niche", "syn"],
  "repository": {
    "type": "git",
    "url": "https://github.com/statuz/statuz.git"
  },
  "engines": {
    "vscode": "^1.95.0"
  }
}
```

### Marketplace Assets

#### Required Assets

✅ **Icon**: 128x128 PNG at `resources/icon.png` (Ready)
✅ **README**: Auto-generated from `README.md`
✅ **License**: Apache-2.0 specified

#### Optional but Recommended

- [ ] **Screenshots**: Add to README.md (not required)
- [ ] **Changelog**: Maintain in separate CHANGELOG.md
- [ ] **Preview Images**: Create demo images in `resources/`

---

## Part 7: Troubleshooting

### Common Issues

#### 1. "Extension name is invalid"

**Cause**: Invalid name format
**Solution**: 
- Use lowercase letters, numbers, and hyphens
- Don't use `@` prefix or scope
- Example: `statuz-vscode` ✓

#### 2. "Publisher not found"

**Cause**: Not logged in or publisher doesn't exist
**Solution**:
```bash
# Verify publisher name matches
npx vsce show statuz.statuz-vscode

# Re-authenticate
npx vsce login statuz
```

#### 3. "Asset not found"

**Cause**: Missing required files
**Solution**:
```bash
# Check package contents
npx vsce ls

# Verify package.json paths are correct
# Rebuild if needed
npm run build
```

#### 4. "Package too large"

**Cause**: Including unnecessary files
**Solution**:
- Check `.vscodeignore` configuration
- Add unnecessary files to ignore list
- Consider bundling with webpack/esbuild

#### 5. "Token is invalid or expired"

**Cause**: PAT expired or incorrect
**Solution**:
- Generate new token in marketplace
- Update environment variable or GitHub secret
- Verify token has correct permissions

#### 6. "Extension already exists"

**Cause**: Version conflict
**Solution**:
- Increment version number in package.json
- Or unpublish existing version first

#### 7. "Open VSX namespace not found"

**Cause**: Publisher namespace doesn't exist
**Solution**:
```bash
# Create namespace
npx ovsx create-namespace statuz --pat $env:OVSX_PAT
```

### Validation Commands

```bash
# Validate extension package
npx vsce validate

# Check package contents
npx vsce ls

# View extension details
npx vsce show statuz.statuz-vscode

# Test package installation
code --install-extension statuz-vscode-0.5.0.vsix
```

---

## Part 8: Best Practices

### Pre-Publication Checklist

- [x] VSIX file generated and valid
- [x] TypeScript build successful
- [x] All dependencies declared correctly
- [x] Icon 128x128 PNG exists
- [x] README.md complete and accurate
- [x] Version number updated
- [x] package.json metadata correct
- [x] Repository URL verified
- [x] License specified (Apache-2.0)

### Security Best Practices

1. **Never commit tokens**: Use environment variables or GitHub Secrets
2. **Rotate tokens regularly**: Set expiration dates
3. **Use minimum required scopes**: Don't give more permissions than needed
4. **Store tokens securely**: Don't log or expose tokens in CI/CD

### Performance Best Practices

1. **Minimize dependencies**: Reduces package size and load time
2. **Bundle code**: Use webpack/esbuild for production builds
3. **Optimize assets**: Compress images, minimize schemas
4. **Test load time**: Extension should load within 1 second

### Documentation Best Practices

1. **Keep README updated**: Clear installation and usage instructions
2. **Document commands**: List all available commands
3. **Provide examples**: Show real-world usage
4. **Maintain changelog**: Track all changes and versions

---

## Part 9: Resources

### Official Documentation

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [vsce GitHub Repository](https://github.com/microsoft/vscode-vsce)
- [Open VSX Documentation](https://github.com/eclipse/openvsx/wiki)
- [Open VSX Registry API](https://github.com/eclipse/openvsx/wiki/Using-the-Registry-API)

### Community Resources

- [VS Code Extension Samples](https://github.com/microsoft/vscode-extension-samples)
- [Awesome VS Code Extensions](https://github.com/viatsko/awesome-vscode)
- [VS Code Marketplace](https://marketplace.visualstudio.com)

### Support Channels

- **GitHub Issues**: [statuz/statuz](https://github.com/statuz/statuz/issues)
- **Open VSX Support**: [open-vsx.org](https://open-vsx.org)
- **VS Code Community**: [VS Code GitHub](https://github.com/microsoft/vscode)

---

## Quick Reference Card

### Local Publishing Commands

```bash
# Build and package
cd packages/vscode-extension
npm install
npm run build
npx vsce package

# Publish to Open VSX
npx ovsx publish statuz-vscode-0.5.0.vsix --pat $env:OVSX_PAT

# Publish to VS Code Marketplace
npx vsce publish --pat $env:VSCE_PAT
```

### Environment Variables

```bash
# Open VSX
OVSX_PAT=<your-token>

# VS Code Marketplace
VSCE_PAT=<your-personal-access-token>
```

### Marketplace URLs

- **Open VSX**: https://open-vsx.org/extension/statuz/statuz-vscode
- **VS Code Marketplace**: https://marketplace.visualstudio.com/items?itemName=statuz.statuz-vscode

---

## Next Steps After Publication

1. **Monitor installation stats**: Check marketplace dashboards
2. **Collect feedback**: Enable Q&A in marketplace
3. **Update based on feedback**: Regular updates and bug fixes
4. **Promote extension**: Share on social media, blog posts
5. **Maintain documentation**: Keep README and docs up-to-date

---

## Version History

- **0.5.0**: Initial published version with Statuz and Niche protocol support
  - YAML validation for statuz.yaml
  - Niche protocol support (manifest, signals, assessments, contexts, outcomes, calibrations, syn)
  - Niche Explorer view
  - SYN decision tracking
  - Real-time diagnostics

---

**Last Updated**: 2026-05-30
**Document Version**: 1.0
**Maintained By**: Statuz Development Team
