import { existsSync, readFileSync } from "node:fs";
import { resolve, join, dirname, extname } from "node:path";
import type { Arrow } from "../arrow-map/types.js";

interface DetectedArrow {
  arrow: Arrow;
  confidence: number;
  source: string;
}

export async function detectAuto(threshold: number): Promise<DetectedArrow[]> {
  const detected: DetectedArrow[] = [];

  console.log("🔍 Scanning project files...");

  detected.push(...scanPackageJson());
  detected.push(...scanDockerCompose());
  detected.push(...scanImports());

  const filtered = detected.filter((d) => d.confidence >= threshold);

  console.log(`\n📊 Auto-detection complete:`);
  console.log(`   Total candidates: ${detected.length}`);
  console.log(`   Above threshold (${threshold}): ${filtered.length}`);

  for (const d of filtered) {
    console.log(
      `   [${d.confidence.toFixed(2)}] ${d.arrow.type}: ${d.arrow.source} → ${d.arrow.target} (${d.source})`
    );
  }

  return filtered;
}

function scanPackageJson(): DetectedArrow[] {
  const arrows: DetectedArrow[] = [];
  const packagePath = resolve(process.cwd(), "package.json");

  if (!existsSync(packagePath)) {
    console.log("  ℹ package.json not found — skipping npm dependency scan");
    return arrows;
  }

  const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
  const projectName = pkg.name || "this-project";

  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const depCount = Object.keys(deps).length;
  console.log(`  ✓ Found package.json with ${depCount} dependencies`);

  for (const [name, version] of Object.entries(deps)) {
    const depType = pkg.dependencies?.[name] ? "production" : "development";
    arrows.push({
      arrow: {
        id: `auto-dep-${name}`,
        source: projectName,
        target: name,
        type: "dependency",
        description: `Detected from package.json: ${projectName} depends on ${name}@${version} (${depType} dependency)`,
        properties: {
          reason: `Dependency in package.json: ${name}@${version}`,
          criticality: depType === "production" ? "high" : "medium",
        },
        metadata: {
          confidence: 0.9,
          discovery_method: "detected",
          discovered_at: new Date().toISOString(),
          detector_id: "package-json-scanner",
        },
      },
      confidence: 0.9,
      source: "package.json",
    });
  }

  return arrows;
}

function scanDockerCompose(): DetectedArrow[] {
  const arrows: DetectedArrow[] = [];
  const composePath = resolve(process.cwd(), "docker-compose.yml");

  if (!existsSync(composePath)) {
    console.log("  ℹ docker-compose.yml not found — skipping Docker dependency scan");
    return arrows;
  }

  console.log("  ✓ Found docker-compose.yml");
  const content = readFileSync(composePath, "utf8");
  const dependsOnRegex = /depends_on:\s*\n((?:\s+-\s+(\w+)\s*\n)+)/g;
  let match;

  while ((match = dependsOnRegex.exec(content)) !== null) {
    const beforeMatch = content.substring(0, match.index);
    const serviceMatch = beforeMatch.match(/(\w+):\s*\n[^\n]*$/);
    if (serviceMatch) {
      const serviceName = serviceMatch[1];
      const deps = match[0].match(/-\s+(\w+)/g);
      if (deps) {
        for (const dep of deps) {
          const depName = dep.replace(/-\s+/, "");
          arrows.push({
            arrow: {
              id: `auto-compose-${serviceName}-${depName}`,
              source: serviceName,
              target: depName,
              type: "dependency",
              description: `Detected from docker-compose.yml: ${serviceName} container depends on ${depName} container for startup order`,
              properties: {
                reason: `Docker Compose depends_on: ${serviceName} depends on ${depName}`,
                criticality: "critical",
              },
              metadata: {
                confidence: 0.95,
                discovery_method: "detected",
                discovered_at: new Date().toISOString(),
                detector_id: "docker-compose-scanner",
              },
            },
            confidence: 0.95,
            source: "docker-compose.yml",
          });
        }
      }
    }
  }

  return arrows;
}

function scanImports(): DetectedArrow[] {
  const arrows: DetectedArrow[] = [];
  const srcDirs = ["./src", "./lib", "./apps"];

  let foundDirs = 0;
  for (const dir of srcDirs) {
    const fullDir = resolve(process.cwd(), dir);
    if (!existsSync(fullDir)) continue;
    foundDirs++;
  }

  if (foundDirs === 0) {
    console.log("  ℹ No src/lib/apps directories found — skipping source import scan");
    return arrows;
  }

  console.log(`  ✓ Found ${foundDirs} source directories to scan`);

  for (const dir of srcDirs) {
    const fullDir = resolve(process.cwd(), dir);
    if (!existsSync(fullDir)) continue;

    const files = findFiles(fullDir, [".ts", ".js", ".tsx", ".jsx"]);
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      const importMatches = content.matchAll(/from\s+['"]\.\/([^'"]+)['"]/g);
      const sourceModule = file.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "") || "unknown";

      for (const match of importMatches) {
        const targetPath = match[1];
        const targetModule = targetPath.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "") || "unknown";

        arrows.push({
          arrow: {
            id: `auto-import-${sourceModule}-${targetModule}`,
            source: sourceModule,
            target: targetModule,
            type: "dependency",
            description: `Detected from source import: ${sourceModule} module imports ${targetModule} module via relative path`,
            properties: {
              reason: `Import in ${file}: ${sourceModule} imports ${targetModule}`,
              criticality: "medium",
            },
            metadata: {
              confidence: 0.8,
              discovery_method: "detected",
              discovered_at: new Date().toISOString(),
              detector_id: "import-scanner",
            },
          },
          confidence: 0.8,
          source: file,
        });
      }
    }
  }

  return arrows;
}

function findFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const fs = require("fs");
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".git") {
        walk(fullPath);
      } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }

  try {
    walk(dir);
  } catch {
    // Ignore errors
  }

  return files;
}
