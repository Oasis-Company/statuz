import type { LlmMessage, LlmResponse, LlmStreamChunk, LlmConfig } from "../types.js";
import { LlmClient } from "../client.js";

interface OpenAiMessage {
  role: string;
  content: string;
  name?: string;
}

interface OpenAiChoice {
  message?: {
    role: string;
    content: string;
  };
  delta?: {
    content?: string;
  };
  finish_reason: string;
}

interface OpenAiUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenAiResponse {
  choices: OpenAiChoice[];
  usage?: OpenAiUsage;
}

export class OpenAiClient extends LlmClient {
  private baseUrl: string;

  constructor(config: LlmConfig) {
    super(config);
    this.baseUrl = config.baseUrl || "https://api.openai.com/v1";
  }

  async chat(messages: LlmMessage[], options?: Partial<LlmConfig>): Promise<LlmResponse> {
    const mergedOptions = this.mergeOptions(options);
    const url = `${this.baseUrl}/chat/completions`;

    const body = {
      model: mergedOptions.model || this.config.model,
      messages: messages.map(this.convertMessage),
      max_tokens: mergedOptions.maxTokens || 4096,
      temperature: mergedOptions.temperature || 0.7,
      top_p: mergedOptions.topP || 1,
      stream: false,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), mergedOptions.timeout || 30000);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await this.parseError(response);
      throw error;
    }

    const data: OpenAiResponse = await response.json();
    const choice = data.choices[0];

    return {
      content: choice.message?.content || "",
      usage: data.usage
        ? {
            prompt_tokens: data.usage.prompt_tokens,
            completion_tokens: data.usage.completion_tokens,
            total_tokens: data.usage.total_tokens,
          }
        : undefined,
      finish_reason: choice.finish_reason,
    };
  }

  async *chatStream(
    messages: LlmMessage[],
    options?: Partial<LlmConfig>
  ): AsyncIterable<LlmStreamChunk> {
    const mergedOptions = this.mergeOptions(options);
    const url = `${this.baseUrl}/chat/completions`;

    const body = {
      model: mergedOptions.model || this.config.model,
      messages: messages.map(this.convertMessage),
      max_tokens: mergedOptions.maxTokens || 4096,
      temperature: mergedOptions.temperature || 0.7,
      top_p: mergedOptions.topP || 1,
      stream: true,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), mergedOptions.timeout || 30000);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await this.parseError(response);
      throw error;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw this.createError("Response body is null", "NULL_RESPONSE", 500, false);
    }

    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) {
          continue;
        }

        const dataStr = trimmed.slice(6);
        if (dataStr === "[DONE]") {
          yield { content: "", is_done: true };
          return;
        }

        try {
          const data: OpenAiResponse = JSON.parse(dataStr);
          const choice = data.choices[0];
          const content = choice.delta?.content || "";

          yield {
            content,
            is_done: choice.finish_reason !== null,
          };
        } catch {
          continue;
        }
      }
    }
  }

  async embed(text: string): Promise<number[]> {
    const url = `${this.baseUrl}/embeddings`;

    const body = {
      input: text,
      model: "text-embedding-3-small",
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await this.parseError(response);
      throw error;
    }

    const data = await response.json();
    return data.data[0]?.embedding || [];
  }

  private convertMessage(message: LlmMessage): OpenAiMessage {
    return {
      role: message.role,
      content: message.content,
      name: message.name,
    };
  }

  private async parseError(response: Response) {
    try {
      const data = await response.json();
      const message = data.error?.message || `HTTP error ${response.status}`;
      const code = data.error?.type || `HTTP_${response.status}`;
      const retryable = response.status >= 500 || response.status === 429;
      return this.createError(message, code, response.status, retryable);
    } catch {
      return this.createError(
        `HTTP error ${response.status}`,
        `HTTP_${response.status}`,
        response.status,
        response.status >= 500 || response.status === 429
      );
    }
  }
}