const throwIfUndefined = (key: string): string => {
  const envVar = process.env[key];

  if (!envVar) {
    throw new Error(`Environment Variable ${key} was not found`);
  }

  return envVar;
};

export default {
  cloudflareZoneId: throwIfUndefined("CLOUDFLARE_ZONE_ID"),
  cloudflareApiToken: throwIfUndefined("CLOUDFLARE_API_TOKEN"),
  cloudflareTunnelUrl: throwIfUndefined("CLOUDFLARE_TUNNEL_URL"),
  dockerSock: throwIfUndefined("DOCKER_SOCK"),
  dockerLabel: process.env.DOCKER_LABEL,
};
