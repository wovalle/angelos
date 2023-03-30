process.env.PROVIDER = "docker"
process.env.CLOUDFLARE_DNS_ZONE_ID = "cf-zone-id"
process.env.CLOUDFLARE_DNS_API_TOKEN = "test"
process.env.CLOUDFLARE_DNS_TUNNEL_UUID = "4e8f7ca1-3bb9-4afa-8b3f-b63aa370a546"

process.env.TRAEFIK_API_URL = "http://traefik.angelos.rocks/api"

/* JWT info
  {
    "a": "foo_account_id",
    "t": "foo_tunnel_id",
    "s": "foo_whatever_this_means"
  }
*/
process.env.CLOUDFLARE_TUNNEL_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhIjoiZm9vX2FjY291bnRfaWQiLCJ0IjoiZm9vX3R1bm5lbF9pZCIsInMiOiJmb29fd2hhdGV2ZXJfdGhpc19tZWFucyJ9.AQ2pjrmQxiCTavObMMhVmIRdZ7zp800yT3pE_oRYLfs"
process.env.CLOUDFLARE_TUNNEL_API_TOKEN = "test"
process.env.CLOUDFLARE_TUNNEL_ZONE_ID = "foo_zone_id"
process.env.CLOUDFLARE_TUNNEL_TARGET_SERVICE = "internal_reverse_proxy"

export {}
