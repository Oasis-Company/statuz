/**
 * @statuz/sdk-ts — agent types
 *
 * Types for the Statuz agent discovery loop — scanner output,
 * proposal documents, and apply-time configuration.
 */

export type ProjectType = "frontend" | "backend" | "library" | "mobile" | "unknown";

export type Language = "ts" | "js" | "py" | "go" | "unknown";

export interface PackageJson {
  name: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  main?: string;
  private?: boolean;
  [key: string]: unknown;
}

export interface ScanResult {
  /** absolutePath: The absolute path to the project directory. */
  absolutePath: string;
  /** projectName: e.g. taskflow-frontend (from directory name or package.json) */
  projectName: string;
  /** projectType: Heuristic categorisation of the project. */
  projectType: ProjectType;
  /** packageJson: The raw, parsed package.json if available. */
  packageJson: PackageJson | null;
  /** topLevelDirs: All directories at the project root level (e.g. ["src", "tests", "public"] */
  topLevelDirs: string[];
  /** mainEntryPoint: The first entry .ts/.js file if found. */
  mainEntryPoint: string | null;
  /** frameworks: e.g. ["react", "vite", "express"] */
  frameworks: string[];
  /** testFrameworks: e.g. ["jest", "vitest"] */
  testFrameworks: string[];
  /** language: primary source language. */
  language: Language;
  /** rawImports: up to 5 unique external package names found in sample source files. */
  rawImports: string[];
  /** siblingProjectDirs: other directories at the parent level (potential sibling projects). */
  siblingProjectDirs: string[];
}

/**
 * ProposedArrow — an arrow suggested by the proposal engine.
 * Used before being serialized into the SYN proposal file.
 */
export interface ProposedArrow {
  fromMap: string;
  fromNode: string;
  toMap: string;
  toNode: string;
  type: string;
  description: string;
}

/**
 * ProjectAddition — a new project, as recorded in the proposal document.
 */
export interface ProposedMap {
  mapId: string;
  version: string;
  scope: string;
}
