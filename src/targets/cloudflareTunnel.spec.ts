import { mockClear } from "jest-mock-extended"
import { rest } from "msw"
import { setupServer } from "msw/node"
import { cloudflareEndpoints } from "../lib/cloudflareHelpers"
import {
  getCloudflareRecordsMock,
  getCloudflareTunnelConfigurationMock,
  getCloudflareTunnelsMock,
  getCloudflareVerifyTokenMock,
} from "../test/fixtures"
import { addMswHandlerOnce, getLoggerMock } from "../test/helpers"
import { CloudflareHost, Target } from "../types"
import { CloudflareTunnel } from "./cloudflareTunnel"

const TUNNEL_ID = "foo_tunnel_id"
const ACCOUNT_ID = "foo_account_id"
const ZONE_ID = "foo_zone_id"

const mswServer = setupServer(
  rest.get(cloudflareEndpoints.getDnsRecordsForZone(ZONE_ID)[1], (req, res, ctx) => {
    const records = getCloudflareRecordsMock([
      { id: "@", name: "angelos.rocks" },
      { id: "cf", name: "cf.angelos.rocks" },
      { id: "non-existent", name: "non-existent.angelos.rocks" },
    ])
    return res(ctx.json(records))
  }),

  rest.get(cloudflareEndpoints.verifyToken, (req, res, ctx) => {
    return res(ctx.json(getCloudflareVerifyTokenMock()))
  }),

  rest.get(
    cloudflareEndpoints.getTunnelDetailsForTunnel(ACCOUNT_ID, TUNNEL_ID),
    (req, res, ctx) => {
      return res(ctx.json(getCloudflareTunnelsMock()))
    }
  ),

  rest.get(
    cloudflareEndpoints.getTunnelConfigurationForTunnelId(ACCOUNT_ID, TUNNEL_ID)[1],
    (req, res, ctx) => {
      return res(
        ctx.json(
          getCloudflareTunnelConfigurationMock([
            ["angelos.rocks", "http://angelos"],
            ["cf.angelos.rocks", "http://service-cf"],
            ["no-dns-record.angelos.rocks", "http://no-dns-record"],
          ])
        )
      )
    }
  )
)

describe("CloudflareTunnel", () => {
  const logger = getLoggerMock()

  beforeAll(() => {
    mswServer.listen({
      onUnhandledRequest: "error",
    })
  })

  afterAll(() => {
    mswServer.close()
  })

  beforeEach(() => mswServer.resetHandlers())

  describe("when setup is called", () => {
    describe("and the token is invalid", () => {
      beforeEach(() => {
        addMswHandlerOnce(mswServer, cloudflareEndpoints.getVerifyToken(), { success: false })
      })

      it("should throw an error", async () => {
        const target = new CloudflareTunnel(logger)

        await expect(target.setup()).rejects.toThrowError("Error verifying token")
      })
    })

    describe("and tunnel_id cannot be found", () => {
      it.todo("should throw an error")
    })
    describe("and configuration is not valid", () => {
      it.todo("should throw an error")
    })

    describe("and dns records cannot be found", () => {
      it.todo("should throw an error")
    })

    describe("and everything is valid", () => {
      it("it should not throw", async () => {
        const target = new CloudflareTunnel(logger)

        await target.setup()
      })
    })
  })

  describe("when getHosts is called", () => {
    describe("and cloudflare does not return any records", () => {
      beforeEach(() => {
        addMswHandlerOnce(
          mswServer,
          cloudflareEndpoints.getTunnelConfigurationForTunnelId(ACCOUNT_ID, TUNNEL_ID),
          getCloudflareTunnelConfigurationMock([])
        )
      })

      it("should return an empty array", async () => {
        const target = new CloudflareTunnel(logger)

        await expect(target.getHosts()).resolves.toEqual([])
      })
    })

    describe("and cloudflare returns records", () => {
      it("should return the hosts", async () => {
        const target = new CloudflareTunnel(logger)

        await expect(target.getHosts()).resolves.toEqual([
          {
            id: "http://angelos",
            name: "angelos.rocks",
            meta: {
              accountId: ACCOUNT_ID,
              dnsRecordId: "@",
              tunnelId: TUNNEL_ID,
              zoneId: ZONE_ID,
            },
          },
          {
            id: "http://service-cf",
            name: "cf.angelos.rocks",
            meta: {
              accountId: ACCOUNT_ID,
              dnsRecordId: "cf",
              tunnelId: TUNNEL_ID,
              zoneId: ZONE_ID,
            },
          },
          {
            id: "http://no-dns-record",
            name: "no-dns-record.angelos.rocks",
            meta: {
              accountId: ACCOUNT_ID,
              dnsRecordId: undefined,
              tunnelId: TUNNEL_ID,
              zoneId: ZONE_ID,
            },
          },
        ])
      })
    })
  })

  describe("when apply is called", () => {
    let target: Target<CloudflareHost>

    beforeEach(async () => {
      target = new CloudflareTunnel(logger)
      await target.setup()

      mockClear(logger)
    })

    describe("when there are no changes", () => {
      it("should not call cloudflare", async () => {
        await target.apply([])
        expect(logger.info).not.toHaveBeenCalled()
      })
    })

    describe("when a new service is added", () => {
      describe("and the service has a dns record", () => {
        beforeEach(() => {
          // Existing dns records

          addMswHandlerOnce(
            mswServer,
            cloudflareEndpoints.getDnsRecordsForZone(ZONE_ID),
            getCloudflareRecordsMock([{ id: "new", name: "new.angelos.rocks" }])
          )

          // Update tunnel configuration
          addMswHandlerOnce(
            mswServer,
            cloudflareEndpoints.updateTunnelConfigurationForTunnelId(ACCOUNT_ID, TUNNEL_ID),
            { success: true }
          )
        })

        it("should add the service to the tunnel configuration", async () => {
          // Update dns records and tunnel configuration
          await target.getHosts()

          await target.apply([
            {
              type: "add",
              host: {
                id: "new",
                name: "new.angelos.rocks",
                meta: {
                  accountId: ACCOUNT_ID,
                  dnsRecordId: "new",
                  tunnelId: TUNNEL_ID,
                  zoneId: ZONE_ID,
                },
              },
            },
          ])

          expect(logger.info).toHaveBeenCalledTimes(2)
          expect(logger.info).toHaveBeenNthCalledWith(
            1,
            "[Tunnel Configuration Update]",
            "Tunnel configuration was updated to route new.angelos.rocks to internal_reverse_proxy"
          )
          expect(logger.info).toHaveBeenNthCalledWith(
            2,
            "[DNS Record Create]",
            "CNAME Record with name new.angelos.rocks already exists in zone foo_zone_id"
          )
        })
      })
      describe("and the service does not have a dns record", () => {
        beforeEach(() => {
          // Update tunnel configuration
          addMswHandlerOnce(
            mswServer,
            cloudflareEndpoints.updateTunnelConfigurationForTunnelId(ACCOUNT_ID, TUNNEL_ID),
            { success: true }
          )

          // Update dns record

          addMswHandlerOnce(mswServer, cloudflareEndpoints.updateDnsRecordForZone(ZONE_ID), {
            success: true,
          })
        })

        it("should add the service to the tunnel configuration and add the dns record", async () => {
          await target.apply([
            {
              type: "add",
              host: {
                id: "new",
                name: "new.angelos.rocks",
                meta: {
                  accountId: ACCOUNT_ID,
                  dnsRecordId: undefined,
                  tunnelId: TUNNEL_ID,
                  zoneId: ZONE_ID,
                },
              },
            },
          ])

          expect(logger.info).toHaveBeenCalledTimes(2)
          expect(logger.info).toHaveBeenNthCalledWith(
            1,
            "[Tunnel Configuration Update]",
            "Tunnel configuration was updated to route new.angelos.rocks to internal_reverse_proxy"
          )
          expect(logger.info).toHaveBeenNthCalledWith(
            2,
            "[DNS Record Create]",
            "CNAME Record with name new.angelos.rocks was created in zone foo_zone_id"
          )
        })
      })
    })

    describe("when a new service is removed", () => {
      describe("and the service has a dns record", () => {
        beforeEach(() => {
          // Update tunnel configuration
          addMswHandlerOnce(
            mswServer,
            cloudflareEndpoints.updateTunnelConfigurationForTunnelId(ACCOUNT_ID, TUNNEL_ID),
            { success: true }
          )

          // Delete Dns Record
          addMswHandlerOnce(mswServer, cloudflareEndpoints.deleteDnsRecordForZone(ZONE_ID, "@"), {
            success: true,
          })
        })

        it("should remove the service from the tunnel configuration and the dns record", async () => {
          // Update dns records and tunnel configuration
          await target.getHosts()

          await target.apply([
            {
              type: "remove",
              host: {
                id: "http://angelos",
                name: "angelos.rocks",
                meta: {
                  accountId: ACCOUNT_ID,
                  dnsRecordId: "@",
                  tunnelId: TUNNEL_ID,
                  zoneId: ZONE_ID,
                },
              },
            },
          ])

          expect(logger.info).toHaveBeenCalledTimes(2)
          expect(logger.info).toHaveBeenNthCalledWith(
            1,
            "[Tunnel Configuration Update]",
            "Tunnel configuration was updated to remove host angelos.rocks"
          )
          expect(logger.info).toHaveBeenNthCalledWith(
            2,
            "[DNS Record Delete]",
            "CNAME Record with name angelos.rocks was deleted in zone foo_zone_id"
          )
        })
      })

      describe("and the service does not have a dns record", () => {
        describe("and the service does not have a dns record", () => {
          beforeEach(() => {
            // Update tunnel configuration
            addMswHandlerOnce(
              mswServer,
              cloudflareEndpoints.updateTunnelConfigurationForTunnelId(ACCOUNT_ID, TUNNEL_ID),
              { success: true }
            )

            // Update dns record
            addMswHandlerOnce(mswServer, cloudflareEndpoints.updateDnsRecordForZone(ZONE_ID), {
              success: true,
            })
          })

          it("should remove the service from the tunnel configuration", async () => {
            await target.apply([
              {
                type: "remove",
                host: {
                  id: "delete",
                  name: "new.angelos.rocks",
                  meta: {
                    accountId: ACCOUNT_ID,
                    dnsRecordId: undefined,
                    tunnelId: TUNNEL_ID,
                    zoneId: ZONE_ID,
                  },
                },
              },
            ])

            expect(logger.info).toHaveBeenCalledTimes(2)
            expect(logger.info).toHaveBeenNthCalledWith(
              1,
              "[Tunnel Configuration Update]",
              "Tunnel configuration was updated to remove host new.angelos.rocks"
            )
            expect(logger.info).toHaveBeenNthCalledWith(
              2,
              "[DNS Record Delete]",
              "CNAME Record with name new.angelos.rocks was not found in zone foo_zone_id"
            )
          })
        })
      })
    })
  })
})
