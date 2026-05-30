<div align="center">
  <img src="../../assets/statuz-logo.svg" alt="Statuz Logo" width="120" />
</div>

# Statuz VS Code Extension

VS Code Extension for the Statuz AI Agent Situated Alignment Protocol.

## Features

- **`statuz init`**: Initialize a Statuz workspace with proper directory structure
- **`statuz validate`**: Validate Statuz and Niche YAML files against official JSON schemas
- **`statuz resume`**: Resume from the current `statuz.yaml` state
- **Niche Management**: Manage niche signals, assessments, context, outcomes, and calibrations
- **SYN Decisions**: View strategic synchronization decisions in a dedicated webview
- **Real-time Diagnostics**: Instant validation feedback for Statuz files
- **Hover Documentation**: Schema information at your fingertips

## Installation

### From VSIX (Development)

1. Build the extension:
   ```bash
   cd packages/vscode-extension
   npm install
   npm run build
   ```

2. Package the extension:
   ```bash
   npx vsce package
   ```

3. Install the .vsix file:
   - Open VS Code
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "Extensions: Install from VSIX..."
   - Select the generated `.vsix` file

### From Marketplace (When Published)

Simply search for "Statuz" in the VS Code Extensions view and click Install.

## Commands

Access all commands via Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

- `Statuz: Initialize Statuz` - Initialize Statuz workspace structure
- `Statuz: Validate All Files` - Validate all Statuz and Niche YAML files
- `Statuz: Resume from Statuz` - Resume agent from current statuz.yaml state
- `Statuz: Initialize Niche` - Initialize Niche workspace structure

## Views

### Niche Explorer (Activity Bar)

- Located in the Activity Bar on the left side
- Displays hierarchical view of Niche components
- Shows signals, assessments, context, outcomes, and calibrations

### SYN Decision View

- Webview panel for viewing SYN decisions
- Accessible from the Niche Explorer

## File Support

The extension provides schema validation for:

- `statuz.yaml` - Main Statuz runtime status file
- `niche-manifest.yaml` - Niche manifest configuration
- `niche/signals/*.yaml` - Niche signal definitions
- `niche/assessments/*.yaml` - Niche assessment records
- `niche/contexts/*.yaml` - Niche context documents
- `niche/outcomes/*.yaml` - Niche outcome records
- `niche/calibrations/*.yaml` - Niche calibration data
- `niche/syn/*.yaml` - SYN decision records

## Requirements

- VS Code 1.95.0 or higher
- Node.js 18.x or higher (for development)

## Known Issues

None at this time.

## Release Notes

### 0.5.0

- Initial release with core Statuz protocol support
- Niche component management
- SYN decision tracking
- JSON Schema validation for all supported file types

## Contributors

This extension is maintained by:

- **ceaserzhao** ([@zbbsdsb](https://github.com/zbbsdsb)) from **Oasis Company**

## License

Apache-2.0
