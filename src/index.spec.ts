import { rest } from "msw";
import { setupServer } from "msw/node";
import { main } from "./operations";
import { getCloudflareRecordsMock, getDockerContainersMock } from "../test/fixtures";

import { CloudflareApi } from "./cloudflare";
import { DockerApi } from "./docker";
import { getMockLogger } from "../test/testUtils";

const mswServer = setupServer(
  rest.get("https://api.cloudflare.com/client/v4/zones/:zoneId/dns_records", (req, res, ctx) => {
    const records = getCloudflareRecordsMock([
      { name: "angelos.rocks" },
      { name: "b.angelos.rocks" },
    ]);
    return res(ctx.json(records));
  }),

  rest.get("http://localhost/v1.41/containers/json", (req, res, ctx) => {
    const containers = getDockerContainersMock([
      { id: "c1", labels: { "angelos.hostname": "angelos.rocks", "angelos.enabled": "true" } },
      { id: "c2", labels: { "angelos.hostname": "a.angelos.rocks", "angelos.enabled": "false" } },
    ]);
    return res(ctx.json(containers));
  })
);

describe("Angelos", () => {
  beforeAll(() => {
    mswServer.listen();
  });

  afterEach(() => mswServer.resetHandlers());
  afterAll(() => mswServer.close());

  it("should properly execute diff", async () => {
    const mockLogger = getMockLogger();

    const scheduleJob = jest.fn();
    const removeJobIfExists = jest.fn();

    await main({
      cloudflareClient: new CloudflareApi(mockLogger, "token", "zone", "url"),
      logger: mockLogger,
      dockerClient: new DockerApi(
        mockLogger,
        "sock",
        "http://localhost/v1.41",
        "angelos.hostname",
        "angelos.enabled"
      ),
      scheduler: {
        scheduleJob,
        scheduleIntervalJob: jest.fn(),
        removeJobIfExists,
        getJobs: jest.fn(),
      },
    });

    expect(removeJobIfExists).toHaveBeenCalledWith(
      expect.objectContaining({ type: "RemoveDnsRecord", jobId: "a.angelos.rocks" })
    );
    expect(scheduleJob).toHaveBeenCalledWith(
      expect.objectContaining({ type: "AddDnsRecord", jobId: "a.angelos.rocks" })
    );
    expect(scheduleJob).toHaveBeenCalledWith(
      expect.objectContaining({ type: "RemoveDnsRecord", jobId: "b.angelos.rocks" })
    );
  });
});
