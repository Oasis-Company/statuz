import { Command } from "commander";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import * as yaml from "yaml";
import { StatusKeeperEngine } from "@statuz/sdk-ts";
import type { StatusKeeperConfig, HealthReport, OutputFormat } from "@statuz/sdk-ts";

function statusKeeperCommand(): Command {
  const cmd = new Command("status-keeper");
  cmd.description("Run health checks on Statuz files and generate health reports");

  cmd
    .command("init")
    .description("Create a default Status Keeper configuration file")
    .option("--output <path>", "Output file path", "./status-keeper.yaml")
    .action((options: { output: string }) => {
      const outPath = resolve(process.cwd(), options.output);
      const outDir = dirname(outPath);

      if (existsSync(outPath)) {
        console.error(`Error: File already exists: ${outPath}`);
        process.exit(1);
      }

      const config = StatusKeeperEngine.getDefaultConfig();

      if (outDir && outDir !== "." && !existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true });
      }

      const content = yaml.stringify(config, {
        defaultKeyType: "PLAIN",
        defaultStringType: "QUOTE_DOUBLE",
        lineWidth: 0,
      });

      writeFileSync(outPath, content, "utf8");
      console.log(`✅ Created Status Keeper config: ${outPath}`);
      console.log(`   Checks: ${config.checks.length}`);
      console.log(`   Output format: ${config.output?.format || "yaml"}`);
    });

  cmd
    .command("run")
    .description("Run health checks from a configuration file and generate a report")
    .option("--config <path>", "Path to Status Keeper config file", "./status-keeper.yaml")
    .option("--output <path>", "Override report output path from config")
    .option("--format <format>", "Override output format: yaml, json, markdown")
    .option("--no-save", "Print results without saving to a file")
    .action((options) => {
      const configPath = resolve(process.cwd(), options.config);

      if (!existsSync(configPath)) {
        console.error(`Error: Config file not found: ${configPath}`);
        process.exit(1);
      }

      let config: StatusKeeperConfig;
      try {
        config = StatusKeeperEngine.readConfig(configPath);
      } catch (err) {
        console.error(`Error: Failed to read config: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }

      const validation = StatusKeeperEngine.validateConfig(config);
      if (!validation.valid) {
        console.error(`❌ Invalid config file: ${configPath}`);
        validation.errors.forEach((e) => console.error(`   - ${e}`));
        process.exit(1);
      }

      const basePath = dirname(configPath);
      const results = StatusKeeperEngine.runChecks(config, basePath);
      const report = StatusKeeperEngine.generateReport(results);

      const passed = results.filter((r) => r.passed).length;
      const failed = results.filter((r) => !r.passed).length;
      const status = report.overall_status === "healthy" ? "✅" : report.overall_status === "degraded" ? "⚠️" : "🔴";

      console.log(`${status} Overall status: ${report.overall_status.toUpperCase()}`);
      console.log(`   Checks passed: ${passed} / ${results.length}`);
      console.log(`   Critical issues: ${report.critical_issues}`);
      console.log(`   Warning issues: ${report.warning_issues}`);
      console.log("");

      for (const result of results) {
        const emoji = result.passed ? "✅" : "❌";
        console.log(`   ${emoji} [${result.severity}] ${result.check_type} — ${result.target}`);
        if (!result.passed) {
          console.log(`      ${result.message}`);
        }
      }

      if (options.save !== false) {
        const outputPath = options.output
          ? resolve(process.cwd(), options.output)
          : config.output?.path
            ? resolve(basePath, config.output.path)
            : resolve(process.cwd(), "./health-report.yaml");

        const format: OutputFormat = (options.format as OutputFormat) || config.output?.format || "yaml";
        const validFormats: OutputFormat[] = ["yaml", "json", "markdown"];
        if (!validFormats.includes(format)) {
          console.error(`Error: Invalid format '${format}'. Must be one of: ${validFormats.join(", ")}`);
          process.exit(1);
        }

        try {
          StatusKeeperEngine.writeReport(outputPath, report, format);
          console.log("");
          console.log(`✅ Report saved: ${outputPath} (${format})`);
        } catch (err) {
          console.error(`Error: Failed to write report: ${err instanceof Error ? err.message : String(err)}`);
          process.exit(1);
        }
      }

      if (report.overall_status === "critical") {
        process.exit(1);
      }
    });

  cmd
    .command("show-report")
    .description("Display a previously generated health report file")
    .argument("<file>", "Path to health report file")
    .action((file: string) => {
      const filePath = resolve(process.cwd(), file);

      if (!existsSync(filePath)) {
        console.error(`Error: Report file not found: ${filePath}`);
        process.exit(1);
      }

      const content = readFileSync(filePath, "utf8");
      let report: HealthReport;

      try {
        report = yaml.parse(content) as HealthReport;
      } catch {
        try {
          report = JSON.parse(content) as HealthReport;
        } catch {
          console.log(content);
          return;
        }
      }

      const statusEmoji = report.overall_status === "healthy" ? "✅" : report.overall_status === "degraded" ? "⚠️" : "🔴";

      console.log("=== Health Report ===");
      console.log(`Generated: ${report.generated_at}`);
      console.log(`Status:    ${statusEmoji} ${report.overall_status.toUpperCase()}`);
      console.log(`Passed:    ${report.checks_passed}`);
      console.log(`Failed:    ${report.checks_failed}`);
      console.log(`Critical:  ${report.critical_issues}`);
      console.log(`Warnings:  ${report.warning_issues}`);
      console.log("");
      console.log("--- Detailed Results ---");

      for (const result of report.results) {
        const passEmoji = result.passed ? "✅" : "❌";
        console.log(`${passEmoji} [${result.severity}] ${result.check_type} — ${result.target}`);
        console.log(`   ${result.message}`);
        if (result.details) {
          console.log(`   Details: ${JSON.stringify(result.details)}`);
        }
        console.log("");
      }

      if (report.recommendations.length > 0) {
        console.log("--- Recommendations ---");
        for (const rec of report.recommendations) {
          console.log(`- ${rec}`);
        }
      }
    });

  return cmd;
}

export { statusKeeperCommand };
