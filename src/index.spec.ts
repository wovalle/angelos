import { main } from ".";
import { DNSRecords } from "../test/fixtures";
import { setupServer } from "msw/node";
import { rest } from "msw";

const mswServer = setupServer(
  rest.get("https://api.cloudflare.com/client/v4/zones/:zoneId/dns_records", (req, res, ctx) => {
    return res(ctx.json(DNSRecords));
  })
);

describe("Angelos", () => {
  beforeAll(() => {
    mswServer.listen();
    process.env = {};
  });
  afterEach(() => mswServer.resetHandlers());
  afterAll(() => mswServer.close());

  

  it("should properly execute diff", async () => {
    await main();
  });
});
