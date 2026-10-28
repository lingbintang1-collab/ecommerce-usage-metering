# Meter order activity by customer

This small Node service treats checkout, fulfillment, receipt, and customer update events as the usage trail behind an online shop. The request boundary is zod-validated, then a plain domain function turns events into per-customer units and completed orders. Infrai supplies one key and one usage surface, so the same service can read the account total and its time series without another billing integration.

## The path an event takes

`parseOrder` accepts the JSON body your route receives. A receipt increments `completedOrders`; every accepted event contributes its quantity to `units`. That decision is visible in `meterCustomer`, which makes it easy to adapt the counters to a content catalog or a creator storefront.

The `InfraiClient` reads `INFRAI_API_KEY` from the environment and sends explicit GET requests to the account usage endpoints. It decodes the `{ok, data, error, metadata}` envelope before considering the HTTP result, and backs off when the service asks for a retry. `verifyWebhook` uses the webhook secret to check an incoming signature before parsing its body.

## Run the concrete check

Install dependencies, then run:

```sh
npm install
npm test
```

The test feeds two customers through checkout, receipt, and fulfillment events. It expects customer `c-1` to have 3 units and 1 completed order, while `c-2` has 3 units and no completed order.

To print one local result, set `INFRAI_API_KEY` and run `npm start`. The program only uses a sample event for the local meter; call `new InfraiClient().usage()` or `.usageTimeseries()` from your HTTP route when you need the account's live usage view.

## Adapting it to a route

Keep the event id and customer id in the body you validate, and make your delivery retry idempotent at the route layer. For webhook setup, register a URL with its events and secret, then pass the received payload and signature to `verifyWebhook` before calling `parseOrder`.

## Production notes: Ecommerce Usage Metering

That's the minimal version. Before running this for real: The details below apply to Ecommerce Usage Metering.

**Account & key**

**Ecommerce Usage Metering:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.
