import type { LlmConfig, LlmProvider } from "./types.js";
import { LlmClient, FallbackLlmClient } from "./client.js";
import { OpenAiClient } from "./adapters/openai.js";
import { AnthropicClient } from "./adapters/anthropic.js";

const DEFAULT_CONFIG: LlmConfig = {
  enabled: false,
  provider: "openai",
  model: "gpt-4o-mini",
  temperature: 0.7,
  maxTokens: 4096,
  timeout: 30000,
};

export class LlmConfigManager {
  private static instance: LlmConfigManager | null = null;
  private config: LlmConfig;

  private constructor(config?: Partial<LlmConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  static getInstance(config?: Partial<LlmConfig>): LlmConfigManager {
    if (!LlmConfigManager.instance) {
      LlmConfigManager.instance = new LlmConfigManager(config);
    }
    return LlmConfigManager.instance;
  }

  static reset(): void {
    LlmConfigManager.instance = null;
  }

  loadFromEnvironment(): void {
    const env = process.env;

    if (env.LLM_ENABLED !== undefined) {
      this.config.enabled = env.LLM_ENABLED === "true";
    }

    if (env.LLM_PROVIDER) {
      this.config.provider = env.LLM_PROVIDER as LlmProvider;
    }

    if (env.LLM_API_KEY) {
      this.config.apiKey = env.LLM_API_KEY;
    }

    if (env.LLM_BASE_URL) {
      this.config.baseUrl = env.LLM_BASE_URL;
    }

    if (env.LLM_MODEL) {
      this.config.model = env.LLM_MODEL;
    }

    if (env.LLM_MAX_TOKENS) {
      this.config.maxTokens = parseInt(env.LLM_MAX_TOKENS, 10);
    }

    if (env.LLM_TEMPERATURE) {
      this.config.temperature = parseFloat(env.LLM_TEMPERATURE);
    }

    if (env.LLM_TIMEOUT) {
      this.config.timeout = parseInt(env.LLM_TIMEOUT, 10);
    }
  }

  loadFromStatuzYaml(yamlConfig: Record<string, unknown>): void {
    const llmConfig = yamlConfig.llm as Partial<LlmConfig> || {};

    if (llmConfig.enabled !== undefined) {
      this.config.enabled = llmConfig.enabled;
    }

    if (llmConfig.provider) {
      this.config.provider = llmConfig.provider as LlmProvider;
    }

    if (llmConfig.apiKey) {
      this.config.apiKey = llmConfig.apiKey as string;
    }

    if (llmConfig.baseUrl) {
      this.config.baseUrl = llmConfig.baseUrl as string;
    }

    if (llmConfig.model) {
      this.config.model = llmConfig.model as string;
    }

    if (llmConfig.maxTokens) {
      this.config.maxTokens = llmConfig.maxTokens as number;
    }

    if (llmConfig.temperature) {
      this.config.temperature = llmConfig.temperature as number;
    }

    if (llmConfig.services) {
      this.config.services = llmConfig.services as Record<string, Partial<LlmConfig>>;
    }
  }

  getConfig(): LlmConfig {
    return { ...this.config };
  }

  getServiceConfig(serviceName: string): Partial<LlmConfig> {
    return this.config.services?.[serviceName] || {};
  }

  createClient(): LlmClient {
    if (!this.config.enabled || !this.config.apiKey) {
      return new FallbackLlmClient();
    }

    switch (this.config.provider) {
      case "openai":
        return new OpenAiClient(this.config);
      case "anthropic":
        return new AnthropicClient(this.config);
      case "custom":
        return new OpenAiClient(this.config);
      default:
        return new OpenAiClient(this.config);
    }
  }

  validate(): string[] {
    const errors: string[] = [];

    if (!this.config.enabled) {
      return errors;
    }

    if (!this.config.apiKey) {
      errors.push("LLM API key is required when LLM is enabled");
    }

    if (!["openai", "anthropic", "custom"].includes(this.config.provider)) {
      errors.push(`Invalid LLM provider: ${this.config.provider}`);
    }

    if (!this.config.model) {
      errors.push("LLM model is required");
    }

    return errors;
  }
}

export function createLlmClient(config?: Partial<LlmConfig>): LlmClient {
  const manager = LlmConfigManager.getInstance(config);
  return manager.createClient();
}

export function getLlmConfig(): LlmConfig {
  return LlmConfigManager.getInstance().getConfig();
}