jest.mock("tslog");

process.env = {
  CLOUDFLARE_ZONE_ID: "cloudflarezoneid",
  CLOUDFLARE_API_TOKEN: "cloudflareapitoken",
  CLOUDFLARE_TUNNEL_URL: "tunnel-uuid.cfargotunnel.com",
  DOCKER_SOCK: "/var/run/docker.sock",
};
