import type { LlmMessage, LlmResponse, LlmStreamChunk, LlmConfig, LlmError } from "./types";

export abstract class LlmClient {
  protected config: LlmConfig;

  constructor(config: LlmConfig) {
    this.config = config;
  }

  abstract chat(messages: LlmMessage[], options?: Partial<LlmConfig>): Promise<LlmResponse>;

  abstract chatStream(
    messages: LlmMessage[],
    options?: Partial<LlmConfig>
  ): AsyncIterable<LlmStreamChunk>;

  abstract embed(text: string): Promise<number[]>;

  async summarize(text: string, maxLength: number = 200): Promise<string> {
    const messages: LlmMessage[] = [
      {
        role: "system",
        content: "Summarize the following text concisely in under " + maxLength + " words.",
      },
      { role: "user", content: text },
    ];

    const response = await this.chat(messages, {
      maxTokens: Math.ceil(maxLength * 1.5),
      temperature: 0.3,
    });

    return response.content.trim();
  }

  protected createError(message: string, code?: string, status?: number, retryable: boolean = false): LlmError {
    const error = new Error(message) as LlmError;
    error.code = code;
    error.status = status;
    error.retryable = retryable;
    return error;
  }

  protected mergeOptions(options?: Partial<LlmConfig>): Partial<LlmConfig> {
    return { ...this.config, ...options };
  }

  isEnabled(): boolean {
    return this.config.enabled && !!this.config.apiKey;
  }
}

export class FallbackLlmClient extends LlmClient {
  constructor() {
    super({ enabled: false, provider: "openai", model: "fallback" });
  }

  async chat(messages: LlmMessage[], options?: Partial<LlmConfig>): Promise<LlmResponse> {
    throw this.createError("LLM is not configured or disabled", "LLM_DISABLED", 400, false);
  }

  async *chatStream(messages: LlmMessage[], options?: Partial<LlmConfig>): AsyncIterable<LlmStreamChunk> {
    throw this.createError("LLM is not configured or disabled", "LLM_DISABLED", 400, false);
  }

  async embed(text: string): Promise<number[]> {
    throw this.createError("LLM is not configured or disabled", "LLM_DISABLED", 400, false);
  }

  isEnabled(): boolean {
    return false;
  }
}