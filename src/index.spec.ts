import { rest } from "msw";
import { setupServer } from "msw/node";
import { makeOperations } from "./operations";
import {
  getCloudflareRecordsMock,
  getDockerContainersMock,
  getTraefikRecordsMock,
} from "../test/fixtures";

import { CloudflareApi } from "./cloudflare";
import { DockerClient } from "./docker";
import { TraefikClient } from "./traefik";
import { getMockLogger } from "../test/testUtils";

jest.mock("./env", () => ({
  traefikApiUrl: "http://traefik.angelos.com/api",
  dockerLabelHostname: "angelos.hostname",
  dockerLabelEnable: "angelos.enabled",
}));

const mswServer = setupServer(
  rest.get("https://api.cloudflare.com/client/v4/zones/:zoneId/dns_records", (req, res, ctx) => {
    const records = getCloudflareRecordsMock([
      { name: "angelos.rocks" },
      { name: "cf.angelos.rocks" },
    ]);
    return res(ctx.json(records));
  }),

  rest.get("http://localhost/containers/json", (req, res, ctx) => {
    const containers = getDockerContainersMock([
      { id: "c1", labels: { "angelos.hostname": "angelos.rocks", "angelos.enabled": "true" } },
      { id: "c2", labels: { "angelos.hostname": "a.angelos.rocks", "angelos.enabled": "true" } },
      {
        id: "c3",
        labels: { "angelos.hostname": "disabled.angelos.rocks", "angelos.enabled": "false" },
      },
    ]);
    return res(ctx.json(containers));
  }),

  rest.get("http://traefik.angelos.com/api/http/routers", (req, res, ctx) => {
    const routers = getTraefikRecordsMock([
      { host: "angelos.rocks", status: "enabled", provider: "docker" },
      { host: ["a.angelos.rocks", "b.angelos.rocks"], status: "enabled", provider: "docker" },
      { host: "c.angelos.rocks", status: "disabled", provider: "docker" },
      { host: "d.angelos.rocks", status: "enabled", provider: "internal" },
      { host: "e.angelos.rocks", status: "enabled", provider: "traefik" },
    ]);

    return res(ctx.json(routers));
  })
);

describe("Angelos", () => {
  beforeAll(() => {
    mswServer.listen();
  });

  afterEach(() => mswServer.resetHandlers());
  afterAll(() => mswServer.close());

  describe("syncOperations", () => {
    const scheduleJob = jest.fn();
    const removeJobIfExists = jest.fn();
    let operations: ReturnType<typeof makeOperations>;

    describe("Docker", () => {
      beforeEach(() => {
        const mockLogger = getMockLogger();

        operations = makeOperations({
          cloudflareClient: new CloudflareApi(mockLogger),
          logger: mockLogger,
          providerClient: new DockerClient(mockLogger),
          scheduler: {
            scheduleJob,
            scheduleIntervalJob: jest.fn(),
            removeJobIfExists,
            getJobs: jest.fn(),
          },
          addDnsRecordDelay: 100,
          deleteDnsRecordDelay: 100,
        });

        jest.clearAllMocks();
      });

      it("should properly execute diff", async () => {
        await operations.syncResources();

        expect(removeJobIfExists).toHaveBeenCalledWith(
          expect.objectContaining({ type: "RemoveDnsRecord", jobId: "a.angelos.rocks" })
        );
        expect(scheduleJob).toHaveBeenCalledWith(
          expect.objectContaining({ type: "AddDnsRecord", jobId: "a.angelos.rocks" })
        );
        expect(scheduleJob).toHaveBeenCalledWith(
          expect.objectContaining({ type: "RemoveDnsRecord", jobId: "cf.angelos.rocks" })
        );
      });
    });

    describe("Traefik", () => {
      beforeEach(() => {
        const mockLogger = getMockLogger();

        operations = makeOperations({
          cloudflareClient: new CloudflareApi(mockLogger),
          logger: mockLogger,
          providerClient: new TraefikClient(mockLogger),
          scheduler: {
            scheduleJob,
            scheduleIntervalJob: jest.fn(),
            removeJobIfExists,
            getJobs: jest.fn(),
          },
          addDnsRecordDelay: 100,
          deleteDnsRecordDelay: 100,
        });

        jest.clearAllMocks();
      });

      it("should properly execute diff", async () => {
        await operations.syncResources();

        expect(removeJobIfExists).toHaveBeenCalledWith(
          expect.objectContaining({ type: "RemoveDnsRecord", jobId: "a.angelos.rocks" })
        );

        expect(scheduleJob).toHaveBeenCalledWith(
          expect.objectContaining({ type: "AddDnsRecord", jobId: "a.angelos.rocks" })
        );
        expect(scheduleJob).toHaveBeenCalledWith(
          expect.objectContaining({ type: "AddDnsRecord", jobId: "b.angelos.rocks" })
        );
        expect(scheduleJob).toHaveBeenCalledWith(
          expect.objectContaining({ type: "AddDnsRecord", jobId: "e.angelos.rocks" })
        );
        expect(scheduleJob).toHaveBeenCalledWith(
          expect.objectContaining({ type: "RemoveDnsRecord", jobId: "cf.angelos.rocks" })
        );
      });
    });
  });
});
