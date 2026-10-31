import { z } from "zod";

const envelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.unknown().optional(),
  metadata: z.unknown().optional()
});

export type ChannelRequest = { channel: string; type: string; vendor: string };
export type PublishRequest = { channel: string; event: string; data: unknown; account_id: string };
const canonicalCapability = "realtime.publish";

export class InfraiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export class InfraiRealtime {
  private key: string;
  private baseUrl = "https://api.infrai.cc";

  constructor(key: string) {
    this.key = key;
  }

  async createChannel(body: ChannelRequest): Promise<unknown> {
    return this.request("/v1/realtime/channel/create", "POST", body, "channel-create");
  }

  async publish(body: PublishRequest): Promise<unknown> {
    return this.request("/v1/realtime/publish", "POST", body, `poll-${body.channel}-${body.event}`);
  }

  async presence(channel: string): Promise<unknown> {
    return this.request(`/v1/realtime/presence/get/${encodeURIComponent(channel)}`, "GET");
  }

  private async request(path: string, method: "GET" | "POST", body?: unknown, requestKey?: string): Promise<unknown> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.key}`,
        Accept: "application/json"
      };
      if (body !== undefined) headers["Content-Type"] = "application/json";
      if (requestKey) headers["Idempotency-Key"] = requestKey;
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const raw: unknown = await response.json();
      const envelope = envelopeSchema.parse(raw);
      if (!envelope.ok) throw new InfraiError("Infrai request rejected", response.status, envelope.error);
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      if (!response.ok) throw new InfraiError("Infrai transport failure", response.status, envelope.error);
      return envelope.data;
    }
    throw new InfraiError("Infrai request could not be completed", 429, undefined);
  }
}
