import { mock } from "jest-mock-extended";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { Logger } from "../lib/logger";
import { Scheduler } from "../scheduler";
import { getTraefikRecordsMock, RouterMockData } from "../test/fixtures";
import { TraefikProvider } from "./traefik";

const mswServer = setupServer(
  rest.get("http://traefik.angelos.rocks/api/version", (req, res, ctx) => {
    return res(ctx.json({ Version: "2.4.8" }));
  }),
  rest.get("http://traefik.angelos.rocks/api/http/routers", (req, res, ctx) => {
    const services = getTraefikRecordsMock([
      { host: "angelos.rocks", status: "enabled", provider: "docker" },
      { host: ["a.angelos.rocks", "b.angelos.rocks"], status: "enabled", provider: "docker" },
      { host: "c.angelos.rocks", status: "disabled", provider: "docker" },
      { host: "d.angelos.rocks", status: "enabled", provider: "internal" },
      { host: "e.angelos.rocks", status: "enabled", provider: "traefik" },
      { host: "a.angelos.rocks", status: "enabled", provider: "traefik" },
    ]);

    return res(ctx.json(services));
  })
);

const mockTraefikRoutersOnce = (services: RouterMockData[]) => {
  mswServer.resetHandlers(
    rest.get("http://traefik.angelos.rocks/api/http/routers", (req, res, ctx) => {
      return res.once(ctx.json(getTraefikRecordsMock(services)));
    })
  );
};

describe("TraefikProvider", () => {
  const logger = mock<Logger>();
  const scheduler = mock<Scheduler>();

  beforeAll(() => {
    mswServer.listen({
      onUnhandledRequest: "error",
    });
  });

  afterAll(() => {
    mswServer.close();
  });

  afterEach(() => mswServer.resetHandlers());

  describe("when setup is called", () => {
    describe("and traefik could not be contacted", () => {
      it("should throw an error", async () => {
        mswServer.resetHandlers(
          rest.get("http://traefik.angelos.rocks/api/version", (req, res, ctx) => {
            return res(ctx.status(500));
          })
        );

        const provider = new TraefikProvider(logger, scheduler);

        await expect(provider.setup()).rejects.toThrowError();
      });
    });

    describe("and traefik could be contacted", () => {
      it("it should not throe", async () => {
        const provider = new TraefikProvider(logger, scheduler);

        await provider.setup();
      });
    });
  });

  describe("when subscribe is called", () => {
    it("should subscribe to traefik events", async () => {
      const provider = new TraefikProvider(logger, scheduler);

      provider.subscribe(jest.fn());

      expect(scheduler.scheduleIntervalJob).toHaveBeenCalledWith(
        expect.objectContaining({ type: "TraefikEvents", fn: expect.any(Function) })
      );
    });

    describe("and job is triggered", () => {
      it("should return an array of hosts that changed since last run ", async () => {
        let jobCallback: Function = () => {};
        const subscribeCallback = jest.fn();

        const provider = new TraefikProvider(
          logger,
          mock<Scheduler>({
            scheduleIntervalJob: (job) => {
              jobCallback = job.fn;
            },
          })
        );

        // to initialize cache
        await provider.setup();

        // Mock response as if some services were removed
        mockTraefikRoutersOnce([{ host: "angelos.rocks", status: "enabled", provider: "docker" }]);

        provider.subscribe(subscribeCallback);

        await jobCallback();

        expect(subscribeCallback).toHaveBeenCalledWith([
          { host: { id: "a,b", name: "a.angelos.rocks" }, type: "remove" },
          { host: { id: "a,b", name: "b.angelos.rocks" }, type: "remove" },
          { host: { id: "e", name: "e.angelos.rocks" }, type: "remove" },
        ]);
      });
    });
  });

  describe("when getHots is called", () => {
    describe("and there are no services running", () => {
      beforeEach(() => {
        mockTraefikRoutersOnce([]);
      });

      it("should return an empty array", async () => {
        const provider = new TraefikProvider(logger, scheduler);

        const hosts = await provider.getHosts();

        expect(hosts).toEqual([]);
      });
    });
    describe("and there are services", () => {
      it("should return an array of hosts filtering disabled containers", async () => {
        const provider = new TraefikProvider(logger, scheduler);

        const hosts = await provider.getHosts();

        expect(hosts).toEqual([
          { id: "@", name: "angelos.rocks" },
          { id: "a,b", name: "a.angelos.rocks" },
          { id: "a,b", name: "b.angelos.rocks" },
          { id: "e", name: "e.angelos.rocks" },
        ]);
      });
    });
  });
});
