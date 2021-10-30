const throwIfUndefined = (key: string): string => {
  const envVar = process.env[key];

  if (!envVar) {
    throw new Error(`Environment Variable ${key} was not found`);
  }

  return envVar;
};

const withDefault = (key: string, def: string): string => {
  const envVar = process.env[key];

  return envVar ?? def;
};

export default {
  cloudflareZoneId: throwIfUndefined("CLOUDFLARE_ZONE_ID"),
  cloudflareApiToken: throwIfUndefined("CLOUDFLARE_API_TOKEN"),
  cloudflareTunnelUrl: throwIfUndefined("CLOUDFLARE_TUNNEL_URL"),
  dockerSock: withDefault("DOCKER_SOCK", "/var/run/docker.sock"),
  dockerApiHost: withDefault("DOCKER_API_HOST", "http://localhost/v1.41"),
  dockerLabel: withDefault("DOCKER_LABEL_HOSTNAME", "angelos.hostname"),
  isEnabled: withDefault("DOCKER_LABEL_ENABLE", "angelos.enabled"),
};
