/**
 * Project Scanner — inspects a project directory and extracts
 * structural information (package.json, directories, imports).
 *
 * Phase 0.1 is LLM-free: detection is done via string matching and
 * heuristics only.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { basename, resolve, join, dirname } from "path";
import type { ScanResult, ProjectType, Language, PackageJson } from "./types.js";

export class ProjectScanner {
  static scan(projectPath: string, parentPath?: string): ScanResult {
    const absPath = resolve(process.cwd(), projectPath);

    const pkgJson = this.readPackageJson(absPath);
    const dirs = this.listDirectories(absPath);
    const sampleFile = this.findSampleSourceFile(absPath, dirs);
    const imports = sampleFile ? this.extractImports(sampleFile) : [];
    const frameworks = this.detectFrameworks(pkgJson);
    const testFrameworks = this.detectTestFrameworks(pkgJson);
    const language = this.detectLanguage(dirs, sampleFile);
    const projectType = this.detectProjectType(
      pkgJson,
      dirs,
      frameworks,
      sampleFile ? imports : []
    );

    const siblings = parentPath
      ? this.listSiblingDirs(parentPath, basename(absPath))
      : this.listSiblingDirs(dirname(absPath), basename(absPath));

    const projectName = pkgJson?.name || basename(absPath);

    return {
      absolutePath: absPath,
      projectName,
      projectType,
      packageJson: pkgJson,
      topLevelDirs: dirs,
      mainEntryPoint: sampleFile,
      frameworks,
      testFrameworks,
      language,
      rawImports: imports.slice(0, 5),
      siblingProjectDirs: siblings,
    };
  }

  private static readPackageJson(absPath: string): PackageJson | null {
    const pkgPath = join(absPath, "package.json");
    if (!existsSync(pkgPath)) return null;
    try {
      return JSON.parse(readFileSync(pkgPath, "utf-8")) as PackageJson;
    } catch {
      return null;
    }
  }

  private static listDirectories(absPath: string): string[] {
    try {
      const entries = readdirSync(absPath);
      return entries
        .filter((entry) => {
          const full = join(absPath, entry);
          return statSync(full).isDirectory() && !entry.startsWith(".");
        })
        .slice(0, 15);
    } catch {
      return [];
    }
  }

  private static findSampleSourceFile(absPath: string, dirs: string[]): string | null {
    const searchDirs = ["src", "lib", "src/components", "src/routes", "src/api", "src/app"]
      .filter((d) => dirs.includes(d) || existsSync(join(absPath, d)))
      .concat(["."]);

    for (const relDir of searchDirs) {
      const dir = relDir === "." ? absPath : join(absPath, relDir);
      if (!existsSync(dir)) continue;
      try {
        const files = readdirSync(dir).filter(
          (f) => f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".js") || f.endsWith(".jsx")
        );
        if (files.length > 0) {
          const candidate = files.find((f) =>
            ["index.ts", "index.tsx", "index.js", "app.ts", "app.tsx", "main.ts", "main.tsx"].includes(f)
          ) || files[0];
          return join(dir, candidate);
        }
      } catch {
        continue;
      }
    }
    return null;
  }

  private static extractImports(filePath: string): string[] {
    try {
      const content = readFileSync(filePath, "utf-8");
      const importRegex = /(?:import|require)\s*(?:[^'"]*['"]([^'"./][^'"]*)['"])/g;
      const imports = new Set<string>();
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const imp = match[1];
        const topLevel = imp.startsWith("@") ? imp.split("/").slice(0, 2).join("/") : imp.split("/")[0];
        imports.add(topLevel);
      }
      return Array.from(imports);
    } catch {
      return [];
    }
  }

  private static detectFrameworks(pkgJson: PackageJson | null): string[] {
    if (!pkgJson) return [];
    const deps = { ...(pkgJson.dependencies || {}), ...(pkgJson.devDependencies || {}) };
    const keywordMap: Record<string, string[]> = {
      react: ["react", "react-dom", "react-native"],
      vue: ["vue", "@vue", "nuxt"],
      angular: ["@angular", "angular"],
      svelte: ["svelte", "@sveltejs"],
      vite: ["vite"],
      webpack: ["webpack"],
      express: ["express"],
      fastify: ["fastify"],
      nestjs: ["@nestjs", "nest"],
      nextjs: ["next"],
      remix: ["@remix-run"],
      graphql: ["graphql", "apollo", "@apollo"],
      tailwind: ["tailwindcss"],
      typescript: ["typescript"],
      testing: ["jest", "vitest", "mocha", "@playwright", "cypress", "pytest"],
    };

    const frameworks: string[] = [];
    for (const [framework, keywords] of Object.entries(keywordMap)) {
      if (keywords.some((kw) => Object.keys(deps).some((d) => d.includes(kw) || d === kw))) {
        frameworks.push(framework);
      }
    }
    return frameworks.slice(0, 5);
  }

  private static detectTestFrameworks(pkgJson: PackageJson | null): string[] {
    if (!pkgJson) return [];
    const deps = { ...(pkgJson.dependencies || {}), ...(pkgJson.devDependencies || {}) };
    const testKeywords = ["jest", "vitest", "mocha", "cypress", "playwright", "pytest"];
    return Object.keys(deps).filter((d) =>
      testKeywords.some((t) => d.includes(t) || d.includes(t.toLowerCase()))
    );
  }

  private static detectLanguage(dirs: string[], sampleFile: string | null): Language {
    if (sampleFile) {
      if (sampleFile.endsWith(".ts") || sampleFile.endsWith(".tsx")) return "ts";
      if (sampleFile.endsWith(".js") || sampleFile.endsWith(".jsx")) return "js";
    }
    const hasPython = dirs.some((d) => d.includes("py"));
    if (hasPython) return "py";
    const hasGo = dirs.some((d) => d.includes("go"));
    if (hasGo) return "go";
    return "unknown";
  }

  private static detectProjectType(
    pkgJson: PackageJson | null,
    dirs: string[],
    frameworks: string[],
    imports: string[]
  ): ProjectType {
    // Explicitly mobile
    if (frameworks.includes("react") && pkgJson?.name?.includes("mobile")) return "mobile";
    if (frameworks.some((f) => f.includes("react-native"))) return "mobile";

    // Backend
    if (
      frameworks.includes("express") ||
      frameworks.includes("fastify") ||
      frameworks.includes("nestjs") ||
      dirs.some((d) => ["routes", "controllers", "server"].includes(d)) ||
      imports.some((i) => ["express", "fastify", "koa", "nestjs", "hono"].includes(i))
    ) {
      return "backend";
    }

    // Frontend
    if (
      frameworks.includes("react") ||
      frameworks.includes("vue") ||
      frameworks.includes("angular") ||
      frameworks.includes("svelte") ||
      frameworks.includes("nextjs") ||
      frameworks.includes("remix") ||
      dirs.some((d) => ["components", "pages", "public", "app"].includes(d))
    ) {
      return "frontend";
    }

    // Library
    if (
      (pkgJson?.private === false && pkgJson?.main) ||
      dirs.some((d) => ["lib", "dist"].includes(d)) ||
      (pkgJson?.scripts && (pkgJson.scripts["build"] || pkgJson.scripts["compile"]))
    ) {
      return "library";
    }

    return "unknown";
  }

  private static listSiblingDirs(parentPath: string, excludeName: string): string[] {
    try {
      const entries = readdirSync(parentPath);
      return entries
        .filter((entry) => {
          if (entry === excludeName) return false;
          if (entry.startsWith(".")) return false;
          const full = join(parentPath, entry);
          return statSync(full).isDirectory();
        })
        .slice(0, 10);
    } catch {
      return [];
    }
  }
}
