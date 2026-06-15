import type { LlmMessage, LlmResponse, LlmStreamChunk, LlmConfig } from "../types.js";
import { LlmClient } from "../client.js";

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnthropicChoice {
  message?: {
    role: string;
    content: {
      type: string;
      text: string;
    }[];
  };
  delta?: {
    content?: {
      type: string;
      text?: string;
    }[];
  };
  stop_reason?: string;
}

interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
}

interface AnthropicResponse {
  content: { type: string; text: string }[];
  usage: AnthropicUsage;
  stop_reason?: string;
}

export class AnthropicClient extends LlmClient {
  private baseUrl: string;

  constructor(config: LlmConfig) {
    super(config);
    this.baseUrl = config.baseUrl || "https://api.anthropic.com/v1";
  }

  async chat(messages: LlmMessage[], options?: Partial<LlmConfig>): Promise<LlmResponse> {
    const mergedOptions = this.mergeOptions(options);
    const url = `${this.baseUrl}/messages`;

    const { systemMessage, userMessages } = this.convertMessages(messages);

    const body = {
      model: mergedOptions.model || this.config.model || "claude-3-sonnet-20240229",
      max_tokens: mergedOptions.maxTokens || 4096,
      temperature: mergedOptions.temperature || 0.7,
      top_p: mergedOptions.topP || 1,
      system: systemMessage,
      messages: userMessages,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), mergedOptions.timeout || 30000);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await this.parseError(response);
      throw error;
    }

    const data: AnthropicResponse = await response.json();

    return {
      content: data.content.map((c) => c.text).join("\n"),
      usage: {
        prompt_tokens: data.usage.input_tokens,
        completion_tokens: data.usage.output_tokens,
        total_tokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      finish_reason: data.stop_reason,
    };
  }

  async *chatStream(
    messages: LlmMessage[],
    options?: Partial<LlmConfig>
  ): AsyncIterable<LlmStreamChunk> {
    const mergedOptions = this.mergeOptions(options);
    const url = `${this.baseUrl}/messages`;

    const { systemMessage, userMessages } = this.convertMessages(messages);

    const body = {
      model: mergedOptions.model || this.config.model || "claude-3-sonnet-20240229",
      max_tokens: mergedOptions.maxTokens || 4096,
      temperature: mergedOptions.temperature || 0.7,
      top_p: mergedOptions.topP || 1,
      system: systemMessage,
      messages: userMessages,
      stream: true,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), mergedOptions.timeout || 30000);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey || "",
        "anthropic-version": "2023-06-01",
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
          const data = JSON.parse(dataStr);
          const type = data.type;

          if (type === "content_block_delta") {
            const text = data.delta?.text || "";
            yield { content: text, is_done: false };
          } else if (type === "message_stop") {
            yield { content: "", is_done: true };
            return;
          }
        } catch {
          continue;
        }
      }
    }
  }

  async embed(text: string): Promise<number[]> {
    throw this.createError(
      "Embedding not supported by Anthropic API",
      "EMBEDDING_NOT_SUPPORTED",
      400,
      false
    );
  }

  private convertMessages(messages: LlmMessage[]) {
    let systemMessage = "";
    const userMessages: AnthropicMessage[] = [];

    for (const message of messages) {
      if (message.role === "system") {
        systemMessage += message.content + "\n";
      } else {
        userMessages.push({
          role: message.role === "assistant" ? "assistant" : "user",
          content: message.content,
        });
      }
    }

    return { systemMessage: systemMessage.trim(), userMessages };
  }

  private async parseError(response: Response) {
    try {
      const data = await response.json();
      const message = data.error?.message || data.message || `HTTP error ${response.status}`;
      const code = data.error?.type || data.error?.code || `HTTP_${response.status}`;
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