import { EndpointTuple } from "../types"

export const cloudflareEndpoints = {
  baseDnsRecords: "https://api.cloudflare.com/client/v4/zones/:zoneId/dns_records",
  baseDnsRecord: "https://api.cloudflare.com/client/v4/zones/:zoneId/dns_records/:id",
  verifyToken: "https://api.cloudflare.com/client/v4/user/tokens/verify",
  getTunnelDetails:
    "https://api.cloudflare.com/client/v4/accounts/:account_id/cfd_tunnel/:tunnel_id",
  getTunnelConfiguration:
    "https://api.cloudflare.com/client/v4/accounts/:account_id/cfd_tunnel/:tunnel_id/configurations",

  getDnsRecordsForZone: (zoneId: string): EndpointTuple => [
    "get",
    cloudflareEndpoints.baseDnsRecords.replace(":zoneId", zoneId),
  ],

  updateDnsRecordForZone: (zoneId: string): EndpointTuple => [
    "post",
    cloudflareEndpoints.getDnsRecordsForZone(zoneId)[1],
  ],

  deleteDnsRecordForZone: (zoneId: string, id: string): EndpointTuple => [
    "post",
    cloudflareEndpoints.baseDnsRecord.replace(":zoneId", zoneId).replace(":id", id),
  ],

  getTunnelDetailsForTunnel: (accountId: string, tunnelId: string): EndpointTuple => [
    "get",
    cloudflareEndpoints.getTunnelDetails
      .replace(":account_id", accountId)
      .replace(":tunnel_id", tunnelId),
  ],

  getTunnelConfigurationForTunnelId: (accountId: string, tunnelId: string): EndpointTuple => [
    "get",
    cloudflareEndpoints.getTunnelConfiguration
      .replace(":account_id", accountId)
      .replace(":tunnel_id", tunnelId),
  ],

  getVerifyToken: (): EndpointTuple => ["get", cloudflareEndpoints.verifyToken],

  updateTunnelConfigurationForTunnelId: (accountId: string, tunnelId: string): EndpointTuple => [
    "put",
    cloudflareEndpoints.getTunnelConfigurationForTunnelId(accountId, tunnelId)[1],
  ],
}
