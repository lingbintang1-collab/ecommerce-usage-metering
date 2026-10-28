import assert from "node:assert/strict";
import { meterCustomer, parseOrder } from "./order_meter.ts";

const events = [
  parseOrder({ customerId: "c-1", orderId: "o-1", event: "checkout", quantity: 2, occurredAt: "2026-01-01T00:00:00.000Z" }),
  parseOrder({ customerId: "c-1", orderId: "o-1", event: "receipt", quantity: 1, occurredAt: "2026-01-01T00:01:00.000Z" }),
  parseOrder({ customerId: "c-2", orderId: "o-2", event: "fulfillment", quantity: 3, occurredAt: "2026-01-01T00:02:00.000Z" })
];
assert.deepEqual(meterCustomer(events), [
  { customerId: "c-1", units: 3, completedOrders: 1 },
  { customerId: "c-2", units: 3, completedOrders: 0 }
]);
console.log("metering decision test passed");
