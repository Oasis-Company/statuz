export interface Signal {
  id?: string;
  type: string;
  source: string;
  target?: string;
  payload: Record<string, unknown>;
  receivedAt?: string;
}

export interface SynRequest {
  id?: string;
  requester: string;
  type: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  status?: "pending" | "approved" | "rejected";
  createdAt?: string;
}

export interface SignalResponse {
  success: boolean;
  signal?: Signal;
  signals?: Signal[];
}

export interface SynResponse {
  success: boolean;
  request?: SynRequest;
  requests?: SynRequest[];
}

export class CoordinationClient {
  private baseUrl: string;

  constructor(baseUrl: string = "http://localhost:3000") {
    this.baseUrl = baseUrl;
  }

  async sendSignal(signal: Omit<Signal, "id" | "receivedAt">): Promise<Signal> {
    const response = await fetch(`${this.baseUrl}/api/v1/signals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signal),
    });

    if (!response.ok) {
      throw new Error(`Failed to send signal: ${response.statusText}`);
    }

    const result = (await response.json()) as SignalResponse;
    if (!result.success || !result.signal) {
      throw new Error("Failed to send signal: invalid response");
    }

    return result.signal;
  }

  async getSignals(): Promise<Signal[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/signals`);

    if (!response.ok) {
      throw new Error(`Failed to get signals: ${response.statusText}`);
    }

    const result = (await response.json()) as SignalResponse;
    if (!result.success || !result.signals) {
      throw new Error("Failed to get signals: invalid response");
    }

    return result.signals;
  }

  async createSynRequest(request: Omit<SynRequest, "id" | "status" | "createdAt">): Promise<SynRequest> {
    const response = await fetch(`${this.baseUrl}/api/v1/syn/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to create SYN request: ${response.statusText}`);
    }

    const result = (await response.json()) as SynResponse;
    if (!result.success || !result.request) {
      throw new Error("Failed to create SYN request: invalid response");
    }

    return result.request;
  }

  async getSynRequests(): Promise<SynRequest[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/syn/requests`);

    if (!response.ok) {
      throw new Error(`Failed to get SYN requests: ${response.statusText}`);
    }

    const result = (await response.json()) as SynResponse;
    if (!result.success || !result.requests) {
      throw new Error("Failed to get SYN requests: invalid response");
    }

    return result.requests;
  }
}
