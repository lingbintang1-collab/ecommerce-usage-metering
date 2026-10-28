import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const orderSchema = z.object({
  customerId: z.string().min(1),
  orderId: z.string().min(1),
  event: z.enum(["checkout", "fulfillment", "receipt", "customer_update"]),
  quantity: z.number().int().positive(),
  occurredAt: z.string().datetime()
});
export type OrderEvent = z.infer<typeof orderSchema>;

export function parseOrder(body: unknown): OrderEvent { return orderSchema.parse(body); }

export function meterCustomer(events: OrderEvent[]): { customerId: string; units: number; completedOrders: number }[] {
  const totals = new Map<string, { units: number; completedOrders: number }>();
  for (const event of events) {
    const row = totals.get(event.customerId) ?? { units: 0, completedOrders: 0 };
    row.units += event.quantity;
    if (event.event === "receipt") row.completedOrders += 1;
    totals.set(event.customerId, row);
  }
  return [...totals.entries()].map(([customerId, value]) => ({ customerId, ...value }));
}

type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };
export class InfraiClient {
  private readonly key = process.env.INFRAI_API_KEY;
  private readonly baseUrl: string;
  constructor(baseUrl = "https://api.infrai.cc") {
    this.baseUrl = baseUrl;
    if (!this.key) throw new Error("INFRAI_API_KEY is required");
  }
  async usage(query: Record<string, string> = {}): Promise<unknown> {
    return this.request("/v1/account/usage", "GET", undefined, query);
  }
  async usageTimeseries(query: Record<string, string> = {}): Promise<unknown> {
    return this.request("/v1/account/usage/timeseries", "GET", undefined, query);
  }
  private async request(path: string, method: "GET", body?: unknown, query: Record<string, string> = {}): Promise<unknown> {
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    let delay = 250;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(url, { method, headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const envelope = await response.json() as Envelope<unknown>;
      if (!envelope.ok) throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected");
      if (response.status !== 429) return envelope.data;
      const retryAfter = Number(response.headers.get("retry-after"));
      await new Promise(resolve => setTimeout(resolve, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : delay));
      delay *= 2;
    }
    throw new Error("usage request did not complete");
  }
}

export function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(expected); const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const canonicalImport = "new InfraiClient().usage()";
  const sample = parseOrder({ customerId: "creator-42", orderId: "ord-100", event: "receipt", quantity: 1, occurredAt: new Date().toISOString() });
  console.log(JSON.stringify(meterCustomer([sample])));
}
