import { rest } from "msw"
import { setupServer } from "msw/node"
import { getCloudflareRecordsMock } from "../test/fixtures"
import { getLoggerMock } from "../test/helpers"
import { CloudflareDNSTarget } from "./cloudflareLegacy"

const mswServer = setupServer(
  rest.get("https://api.cloudflare.com/client/v4/zones/:zoneId/dns_records", (req, res, ctx) => {
    const records = getCloudflareRecordsMock([
      { id: "@", name: "angelos.rocks" },
      { id: "cf", name: "cf.angelos.rocks" },
    ])
    return res(ctx.json(records))
  }),
  rest.get("https://api.cloudflare.com/client/v4/user/tokens/verify", (req, res, ctx) => {
    return res(ctx.json({ success: true }))
  })
)

describe("CloudflareLegacy", () => {
  const logger = getLoggerMock()

  beforeAll(() => {
    mswServer.listen({
      onUnhandledRequest: "error",
    })
  })

  afterAll(() => {
    mswServer.close()
  })

  afterEach(() => mswServer.resetHandlers())

  describe("when setup is called", () => {
    describe("and the token is invalid", () => {
      beforeEach(() => {
        mswServer.resetHandlers(
          rest.get("https://api.cloudflare.com/client/v4/user/tokens/verify", (req, res, ctx) => {
            return res(ctx.json({ success: false }))
          })
        )
      })
      it("should throw an error", async () => {
        const target = new CloudflareDNSTarget(logger)

        await expect(target.setup()).rejects.toThrowError()
      })
    })

    describe("and the token is valid", () => {
      it("it should not throw", async () => {
        const target = new CloudflareDNSTarget(logger)

        await target.setup()
      })
    })
  })
  describe("when getHosts is called", () => {
    describe("and cloudflare does not return any records", () => {
      beforeEach(() => {
        mswServer.resetHandlers(
          rest.get(
            "https://api.cloudflare.com/client/v4/zones/:zoneId/dns_records",
            (req, res, ctx) => {
              return res(ctx.json({ result: [] }))
            }
          )
        )
      })

      it("should return an empty array", async () => {
        const target = new CloudflareDNSTarget(logger)

        await expect(target.getHosts()).resolves.toEqual([])
      })
    })

    describe("and cloudflare returns records", () => {
      it("should return the hosts", async () => {
        const target = new CloudflareDNSTarget(logger)

        await expect(target.getHosts()).resolves.toEqual([
          { id: "@", name: "angelos.rocks" },
          { id: "cf", name: "cf.angelos.rocks" },
        ])
      })
    })
  })

  describe("when apply is called", () => {
    describe("and there are no changes", () => {
      it("should not call cloudflare", async () => {
        const target = new CloudflareDNSTarget(logger)

        await target.apply([])
      })
    })

    describe("and there are changes", () => {
      beforeEach(() => {
        mswServer.resetHandlers(
          rest.post(
            "https://api.cloudflare.com/client/v4/zones/:zoneId/dns_records",
            (req, res, ctx) => {
              return res(ctx.json({ success: true }))
            }
          )
        )
      })

      it("should call cloudflare", async () => {
        const target = new CloudflareDNSTarget(logger)

        await target.apply([
          {
            type: "add",
            host: { id: "new", name: "new.angelos.rocks" },
          },
        ])
      })
    })
  })
})
