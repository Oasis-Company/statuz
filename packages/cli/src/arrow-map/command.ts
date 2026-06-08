import { Command } from "commander";
import { initArrowMap } from "./init.js";
import { validateArrowMapFile } from "./validate.js";
import { detectArrows } from "./detect.js";

export const arrowMapCommand = new Command("arrow-map")
  .description("Manage Arrow Maps — the 66 topological layer")
  .addCommand(
    new Command("init")
      .description("Create a new Arrow Map")
      .option("--from-niche", "Initialize from existing niche manifest")
      .option("--template <template>", "Use a template map as starting point")
      .option("--output <path>", "Output file path", "./arrow-map.yaml")
      .action(initArrowMap)
  )
  .addCommand(
    new Command("validate")
      .description("Validate an Arrow Map YAML file")
      .argument("<file>", "Path to Arrow Map YAML file")
      .action((file: string) => {
        const result = validateArrowMapFile(file);
        if (result.valid) {
          console.log(`✅ Valid Arrow Map: ${result.data?.id}`);
          console.log(`   Nodes: ${result.data?.nodes.length}`);
          console.log(`   Arrows: ${result.data?.arrows.length}`);
        } else {
          console.error(`❌ Validation failed:`);
          result.errors?.forEach((err) => console.error(`   - ${err}`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command("detect")
      .description("Run the Detector to discover arrows")
      .option("--interactive", "Interactive mode: ask user questions")
      .option("--auto", "Automatic mode: scan project files")
      .option(
        "--confidence-threshold <n>",
        "Minimum confidence for auto-detection",
        "0.7"
      )
      .action(detectArrows)
  );
