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
import * as env from "./env";
import { makeScheduler, Scheduler } from "./scheduler";
import { Logger } from "tslog";
import { mock } from "jest-mock-extended";

jest.spyOn(env, "getEnvVars").mockImplementation(() => ({
  traefikApiUrl: "http://traefik.angelos.com/api",
  dockerLabelHostname: "angelos.hostname",
  dockerLabelEnable: "angelos.enabled",
  addDnsRecordDelay: 100,
  deleteDnsRecordDelay: 100,
  cloudflareApiToken: "cf-api-token",
  cloudflareTunnelUrl: "uuid.cfargotunnel.com",
  cloudflareZoneId: "cf-zone-id",
  dryRun: false,
  logLevel: expect.any(String),
  provider: expect.any(String),
  traefikPollInterval: 100,
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

describe("operations", () => {
  let mockLogger = mock<Logger>();
  let scheduler: Scheduler;
  let cloudflareClient: CloudflareApi;

  let operations: ReturnType<typeof makeOperations>;

  beforeAll(() => {
    mswServer.listen({
      onUnhandledRequest: "error",
    });
    jest.useFakeTimers();
  });

  afterEach(() => mswServer.resetHandlers());
  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    scheduler = makeScheduler(mockLogger);
    cloudflareClient = new CloudflareApi(mockLogger);

    operations = makeOperations({
      cloudflareClient,
      logger: mockLogger,
      providerClient: new DockerClient(mockLogger),
      scheduler,
      addDnsRecordDelay: 100,
      deleteDnsRecordDelay: 100,
    });

    jest.clearAllTimers();
  });

  describe("syncOperations", () => {
    beforeEach(() => {
      scheduler = mock<Scheduler>();
      cloudflareClient = new CloudflareApi(mockLogger);

      operations = makeOperations({
        cloudflareClient,
        logger: mockLogger,
        providerClient: new DockerClient(mockLogger),
        scheduler,
        addDnsRecordDelay: 100,
        deleteDnsRecordDelay: 100,
      });

      jest.clearAllTimers();
    });
    describe("Docker", () => {
      it("should properly execute diff", async () => {
        await operations.syncResources();

        expect(scheduler.removeJobIfExists).toHaveBeenCalledWith(
          expect.objectContaining({ type: "RemoveDnsRecord", jobId: "a.angelos.rocks" })
        );
        expect(scheduler.scheduleJob).toHaveBeenCalledWith(
          expect.objectContaining({ type: "AddDnsRecord", jobId: "a.angelos.rocks" })
        );
        expect(scheduler.scheduleJob).toHaveBeenCalledWith(
          expect.objectContaining({ type: "RemoveDnsRecord", jobId: "cf.angelos.rocks" })
        );
      });
    });

    describe.skip("Traefik", () => {
      beforeEach(() => {
        operations = makeOperations({
          cloudflareClient: new CloudflareApi(mockLogger),
          logger: mockLogger,
          providerClient: new TraefikClient(mockLogger),
          scheduler,
          addDnsRecordDelay: 100,
          deleteDnsRecordDelay: 100,
        });
      });

      it("should properly execute diff", async () => {
        await operations.syncResources();

        expect(scheduler.removeJobIfExists).toHaveBeenCalledWith(
          expect.objectContaining({ type: "RemoveDnsRecord", jobId: "a.angelos.rocks" })
        );

        expect(scheduler.scheduleJob).toHaveBeenCalledWith(
          expect.objectContaining({ type: "AddDnsRecord", jobId: "a.angelos.rocks" })
        );
        expect(scheduler.scheduleJob).toHaveBeenCalledWith(
          expect.objectContaining({ type: "AddDnsRecord", jobId: "b.angelos.rocks" })
        );
        expect(scheduler.scheduleJob).toHaveBeenCalledWith(
          expect.objectContaining({ type: "AddDnsRecord", jobId: "e.angelos.rocks" })
        );
        expect(scheduler.scheduleJob).toHaveBeenCalledWith(
          expect.objectContaining({ type: "RemoveDnsRecord", jobId: "cf.angelos.rocks" })
        );
      });
    });
  });

  describe("Scheduled Tasks", () => {
    describe("scheduleAddDnsRecord", () => {
      it("should remove pending delete jobs if scheduled", () => {
        const host = "foo.angelos.com";
        operations.scheduleDeleteDnsRecord(host);

        expect(scheduler.getJobs().get(host)).toEqual(
          expect.objectContaining({ jobId: host, type: "RemoveDnsRecord" })
        );

        operations.scheduleAddDnsRecord(host);

        expect(scheduler.getJobs().get(host)).toEqual(
          expect.objectContaining({ jobId: host, type: "AddDnsRecord" })
        );
      });
      it("should execute AddDnsRecordJob", async () => {
        expect.assertions(1);
        mswServer.use(
          rest.post(
            "https://api.cloudflare.com/client/v4/zones/cf-zone-id/dns_records",
            (req, res, ctx) => {
              expect(req.body).toEqual(
                expect.objectContaining({ type: "CNAME", name: "foo.angelos.com" })
              );
              return res(ctx.json({}));
            }
          )
        );

        operations.scheduleAddDnsRecord("foo.angelos.com");

        jest.runOnlyPendingTimers();
      });
    });

    describe("scheduleDeleteDnsRecord", () => {
      it("should execute DeleteDnsRecordJob if record was previously in cache ", async () => {
        expect.assertions(1);

        mswServer.use(
          rest.delete(
            "https://api.cloudflare.com/client/v4/zones/cf-zone-id/dns_records/cf.angelos.rocks",
            (req, res, ctx) => {
              expect(req.body).toEqual(
                expect.objectContaining({ type: "CNAME", name: "cf.angelos.rocks" })
              );
              return res(ctx.json({}));
            }
          )
        );

        // fill cache
        await cloudflareClient.fetchCNameRecords();

        operations.scheduleDeleteDnsRecord("cf.angelos.rocks");

        jest.runOnlyPendingTimers();
      });
    });
  });
});
