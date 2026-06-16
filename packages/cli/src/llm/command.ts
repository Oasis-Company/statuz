import { Command } from "commander";
import { LlmConfigManager, createLlmClient, LlmClient, getLlmConfig } from "@statuz/sdk-ts";
import type { LlmMessage, LlmConfig } from "@statuz/sdk-ts";

export function llmCommand(): Command {
  const program = new Command("llm")
    .description("LLM integration commands")
    .addCommand(testCommand())
    .addCommand(configCommand())
    .addCommand(chatCommand());

  return program;
}

function testCommand(): Command {
  return new Command("test")
    .description("Test LLM connectivity and configuration")
    .option("--provider <provider>", "LLM provider (openai, anthropic, custom). Use 'custom' for OpenAI-compatible APIs like DeepSeek.")
    .option("--model <model>", "Model name (e.g. gpt-4o-mini, claude-sonnet-4-20250514, deepseek-chat)")
    .option("--api-key <key>", "API key")
    .option("--base-url <url>", "Base URL for custom/OpenAI-compatible providers (e.g. https://api.deepseek.com/v1)")
    .action(async (options) => {
      try {
        const configManager = LlmConfigManager.getInstance();
        configManager.loadFromEnvironment();

        if (options.provider || options.model || options.apiKey || options.baseUrl) {
          const customConfig: Partial<LlmConfig> = {
            enabled: true,
          };
          if (options.provider) customConfig.provider = options.provider as LlmConfig["provider"];
          if (options.model) customConfig.model = options.model;
          if (options.apiKey) customConfig.apiKey = options.apiKey;
          if (options.baseUrl) customConfig.baseUrl = options.baseUrl;
          
          configManager.loadFromStatuzYaml({ llm: customConfig });
        }

        const errors = configManager.validate();
        if (errors.length > 0) {
          console.error("Configuration errors:");
          errors.forEach((err) => console.error(`  - ${err}`));
          process.exit(1);
        }

        const client = createLlmClient();

        if (!client.isEnabled()) {
          console.log("LLM is not configured. Set LLM_ENABLED=true and LLM_API_KEY.");
          process.exit(0);
        }

        console.log(`Testing LLM connection with provider: ${configManager.getConfig().provider}`);
        console.log(`Using model: ${configManager.getConfig().model}`);

        const messages: LlmMessage[] = [
          { role: "user", content: "Say 'Hello, Statuz!' and nothing else." },
        ];

        const response = await client.chat(messages, { maxTokens: 32 });

        if (response.content.trim() === "Hello, Statuz!") {
          console.log("\n✅ LLM connection successful!");
          if (response.usage) {
            console.log(`Token usage: ${response.usage.total_tokens}`);
          }
        } else {
          console.log(`\n⚠️ LLM responded but with unexpected content: ${response.content}`);
        }
      } catch (err) {
        console.error(`❌ LLM connection failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}

function configCommand(): Command {
  return new Command("config")
    .description("Show current LLM configuration")
    .action(() => {
      const configManager = LlmConfigManager.getInstance();
      configManager.loadFromEnvironment();
      const config = configManager.getConfig();

      console.log("Current LLM Configuration:");
      console.log("─────────────────────────");
      console.log(`Enabled: ${config.enabled}`);
      console.log(`Provider: ${config.provider}`);
      console.log(`Model: ${config.model}`);
      console.log(`API Key: ${config.apiKey ? "Set (hidden)" : "Not set"}`);
      console.log(`Base URL: ${config.baseUrl || "Default"}`);
      console.log(`Temperature: ${config.temperature}`);
      console.log(`Max Tokens: ${config.maxTokens}`);
      console.log(`Timeout: ${config.timeout}ms`);

      if (config.services && Object.keys(config.services).length > 0) {
        console.log("\nService-specific overrides:");
        Object.entries(config.services).forEach(([name, serviceConfig]) => {
          console.log(`  ${name}:`);
          if (serviceConfig.model) console.log(`    - model: ${serviceConfig.model}`);
          if (serviceConfig.temperature !== undefined) console.log(`    - temperature: ${serviceConfig.temperature}`);
        });
      }

      const errors = configManager.validate();
      if (errors.length > 0) {
        console.log("\n⚠️ Configuration warnings:");
        errors.forEach((err) => console.log(`  - ${err}`));
      }
    });
}

function chatCommand(): Command {
  return new Command("chat")
    .description("Chat with the configured LLM")
    .argument("<message>", "Message to send")
    .option("--stream", "Enable streaming response")
    .action(async (message, options) => {
      try {
        const configManager = LlmConfigManager.getInstance();
        configManager.loadFromEnvironment();

        const errors = configManager.validate();
        if (errors.length > 0) {
          console.error("Configuration errors:");
          errors.forEach((err) => console.error(`  - ${err}`));
          process.exit(1);
        }

        const client = createLlmClient();

        if (!client.isEnabled()) {
          console.log("LLM is not configured. Set LLM_ENABLED=true and LLM_API_KEY.");
          process.exit(0);
        }

        const messages: LlmMessage[] = [
          { role: "user", content: message },
        ];

        if (options.stream) {
          console.log("LLM: ");
          process.stdout.write("> ");
          for await (const chunk of client.chatStream(messages)) {
            process.stdout.write(chunk.content);
          }
          console.log("\n");
        } else {
          const response = await client.chat(messages);
          console.log(`LLM: ${response.content}`);
          if (response.usage) {
            console.log(`\nTokens: ${response.usage.total_tokens}`);
          }
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}