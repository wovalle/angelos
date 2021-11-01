import { TLogLevelName } from "tslog";

const throwIfUndefined = (key: string): string => {
  const envVar = process.env[key];

  if (!envVar) {
    throw new Error(`Environment Variable ${key} was not found`);
  }

  return envVar;
};

const parseBoolean = (key: string, val: unknown) => {
  if (typeof val !== "string" || !["true", "false"].includes(val)) {
    val;
    throw new Error(`Invalid Boolean field: ${key}=${val}`);
  }

  return val === "true";
};

const parseNumber = (key: string, val: unknown) => {
  if (typeof val !== "string" || Number.isNaN(Number.parseInt(val))) {
    throw new Error(`Invalid Number field: ${key}=${val}`);
  }

  return Number.parseInt(val);
};

const withDefault = <T>(key: string, def: T, fn?: (key: string, val: string) => T): T => {
  const envVar = process.env[key];

  if (!envVar) {
    return def;
  }

  if (typeof fn !== "undefined" && (typeof def === "boolean" || typeof def === "number")) {
    return fn(key, envVar);
  }

  return envVar as any;
};

const validLogLevels = ["silly", "trace", "debug", "info", "warn", "error", "fatal"];
const validProviders = ["docker", "traefik"];

const withAllowedValues = (allowed: string[]) => (key: string, val: string) => {
  if (!allowed.includes(val)) {
    throw new Error(`Invalid ${key}=${val}. Must be one of: ${allowed.join(", ")}`);
  }
  return val;
};

export default {
  cloudflareZoneId: throwIfUndefined("CLOUDFLARE_ZONE_ID"),
  cloudflareApiToken: throwIfUndefined("CLOUDFLARE_API_TOKEN"),
  cloudflareTunnelUrl: throwIfUndefined("CLOUDFLARE_TUNNEL_URL"),
  dockerSock: withDefault("DOCKER_SOCK", "/var/run/docker.sock"),
  dockerApiHost: withDefault("DOCKER_API_HOST", "http://localhost/v1.41"),
  dockerLabelHostname: withDefault("DOCKER_LABEL_HOSTNAME", "angelos.hostname"),
  dockerLabelEnable: withDefault("DOCKER_LABEL_ENABLE", "angelos.enabled"),
  logLevel: withDefault("LOG_LEVEL", "info", withAllowedValues(validLogLevels)) as TLogLevelName,
  dryRun: withDefault("DRY_RUN", false, parseBoolean),
  deleteDnsRecordDelay: withDefault("DELETE_DNS_RECORD_DELAY", 1000 * 60 * 5, parseNumber),
  addDnsRecordDelay: withDefault("ADD_DNS_RECORD_DELAY", 1000 * 60 * 1, parseNumber),
  provider: withDefault("PROVIDER", "docker", withAllowedValues(validProviders)),
};
