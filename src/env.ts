import { TLogLevelName } from "tslog";

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

const loglevel = withDefault("LOG_LEVEL", "info");

if (!["silly", "trace", "debug", "info", "warn", "error", "fatal"].includes(loglevel)) {
  throw new Error(`Invalid LOG_LEVEL: ${loglevel}`);
}

export default {
  cloudflareZoneId: throwIfUndefined("CLOUDFLARE_ZONE_ID"),
  cloudflareApiToken: throwIfUndefined("CLOUDFLARE_API_TOKEN"),
  cloudflareTunnelUrl: throwIfUndefined("CLOUDFLARE_TUNNEL_URL"),
  dockerSock: withDefault("DOCKER_SOCK", "/var/run/docker.sock"),
  dockerApiHost: withDefault("DOCKER_API_HOST", "http://localhost/v1.41"),
  dockerLabelHostname: withDefault("DOCKER_LABEL_HOSTNAME", "angelos.hostname"),
  dockerLabelEnable: withDefault("DOCKER_LABEL_ENABLE", "angelos.enabled"),
  logLevel: loglevel as TLogLevelName,
};
