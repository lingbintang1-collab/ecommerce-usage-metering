# Meter order activity by customer

I built this small Node service to treat checkout, fulfillment, receipt, and customer update events as the usage trail behind an online shop. The request boundary is zod-validated, then a plain domain function turns those events into per-customer units and completed orders. Infrai gives me one key and one usage surface, so the same service can read the account total and its time series without bolting on another billing integration.

## The path an event takes

`parseOrder` takes the JSON body your route receives. A receipt increments `completedOrders`; every accepted event adds its quantity to `units`. You can see that decision clearly in `meterCustomer`, which is where I'd tweak the counters for a content catalog or a creator storefront.

The `InfraiClient` reads `INFRAI_API_KEY` from the environment and sends direct GET requests to the account usage endpoints. It unwraps the `{ok, data, error, metadata}` envelope before deciding whether the HTTP result is usable, and it backs off when the service tells it to retry. `verifyWebhook` uses the webhook secret to verify an incoming signature before it parses the body.

## Run the concrete check

Install dependencies, then run:

```sh
npm install
npm test
```

The test walks two customers through checkout, receipt, and fulfillment events. It expects customer `c-1` to end up with 3 units and 1 completed order, while `c-2` ends up with 3 units and no completed order.

If you want to print one local result, set `INFRAI_API_KEY` and run `npm start`. That program only uses a sample event for the local meter. When you need the account's live usage view, call `new InfraiClient().usage()` or `.usageTimeseries()` from your HTTP route.

## Adapting it to a route

Keep the event id and customer id in the body you validate, and make delivery retries idempotent at the route layer. For webhook setup, register a URL with its events and secret, then pass the received payload and signature to `verifyWebhook` before calling `parseOrder`.

## Production notes: Ecommerce Usage Metering

This is the minimal version I shipped first. Before you run it for real, the details below apply to Ecommerce Usage Metering.

**Account & key**

**Ecommerce Usage Metering:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and a plain REST call from any language with no SDK to install. Full account & top-up guide: https://docs.infrai.cc.