/**
 * statuz agent — the main command for the Phase 0.1 discovery loop.
 *
 *   statuz agent discover ./my-project [--cluster ./cluster.yaml]
 *   ├── scans the project
 *   ├── generates a SYN proposal (.statuz/syn/PROP-001.yaml)
 *   └── prints next-step instructions (approve / reject)
 */

import { Command } from "commander";
import { generateProposal, applyProposal } from "../syn/proposal-engine.js";
import { ProjectScanner, SynProposalIO } from "@statuz/sdk-ts";

export const agentCommand = new Command("agent")
  .description("Agent utilities — discover projects, generate proposals, manage lifecycle");

// statuz agent discover <path>
agentCommand
  .command("discover")
  .description("Scan a project directory, detect its type and dependencies, generate a SYN proposal")
  .argument("<path>", "Path to the project directory to analyze")
  .option("--cluster <path>", "Path to the existing cluster.yaml")
  .option("--output <path>", "Override proposal output path")
  .option("--arrow-description <arrow_key:description>", "Custom arrow description, e.g. 'frontend->backend:HTTP client calls REST'", collectPairs, [])
  .option("--auto-approve", "⚠️  Apply immediately without SYN gate — use carefully")
  .action(async (projectPath: string, opts: any) => {
    try {
      console.log("🔍 Scanning:", projectPath);

      const customArrowDescriptions: Record<string, string> = {};
      for (const pair of opts.arrowDescription || []) {
        const [key, ...rest] = pair.split(":");
        if (key) customArrowDescriptions[key.trim()] = rest.join(":").trim();
      }

      const { proposal, outputPath, isDuplicate, llmEnhanced } = await generateProposal({
        projectPath,
        clusterPath: opts.cluster,
        customArrowDescriptions,
      });

      if (llmEnhanced) {
        console.log("   ├─ LLM enhancement: enabled");
      }

      if (isDuplicate) {
        console.log("   ├─ Project type:", proposal.project.type);
        const maps = proposal.cluster_additions.maps.length;
        const arrows = proposal.cluster_additions.cross_map_arrows?.length || 0;
        console.log("   ├─ New maps suggested:", maps);
        console.log("   └─ New arrows suggested:", arrows);
        console.log("");
        console.log("🔁 Duplicate proposal — detected. Content unchanged.");
        console.log("   Existing proposal path:", outputPath);
        console.log("   Tip: To force-regenerate, delete the existing proposal file.");
        process.exit(0);
      }

      console.log("   ├─ Project type:", proposal.project.type);
      if (proposal.project.framework?.length) {
        console.log("   ├─ Frameworks:", proposal.project.framework.join(", "));
      }
      const maps = proposal.cluster_additions.maps.length;
      const arrows = proposal.cluster_additions.cross_map_arrows?.length || 0;
      console.log("   ├─ New maps suggested:", maps);
      console.log("   └─ New arrows suggested:", arrows);
      console.log("");
      console.log("📝 Proposal written to:", outputPath);
      console.log("");

      if (opts.autoApprove) {
        console.log("⚠️  --auto-approve flag detected — applying now.");
        const result = applyProposal(proposal, opts.cluster);
        printApplyResult(result);
        process.exit(0);
      }

      console.log("Next steps:");
      console.log("   statuz syn show " + outputPath);
      console.log("   statuz syn approve " + outputPath + " --principal <your-name>");
      console.log("   statuz syn reject " + outputPath + " --principal <your-name>");
      console.log("");
    } catch (error) {
      console.error("❌ Failed to generate proposal");
      console.error((error as Error).message);
      process.exit(1);
    }
  });

// statuz agent scan <path> (debug — show raw scanner output only)
agentCommand
  .command("scan")
  .description("Scan a project directory and show raw scanner output (debug)")
  .argument("<path>", "Path to the project directory")
  .action((projectPath: string) => {
    const scan = ProjectScanner.scan(projectPath);
    console.log(JSON.stringify(scan, null, 2));
  });

function collectPairs(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}

function printApplyResult(result: any): void {
  console.log("");
  console.log("✅ Proposal applied.");
  if (result.clusterUpdated?.path) {
    console.log("   ├─ cluster.yaml updated:", result.clusterUpdated.path);
  }
  if (result.projectStatuzDir?.dir) {
    console.log("   └─ .statuz/ created at:", result.projectStatuzDir.dir);
    for (const f of result.projectStatuzDir.files) {
      console.log("      · " + f);
    }
  }
  console.log("");
}
