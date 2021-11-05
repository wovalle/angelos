import { TLogLevelName } from "tslog";

const throwIfUndefined = (key: string): string => {
  const envVar = process.env[key];

  if (!envVar) {
    throw new Error(`Environment Variable ${key} was not found`);
  }

  return envVar;
};

const parseBoolean = (key: string, val: unknown) => {
  if (typeof val === "boolean") {
    return val;
  }

  if (typeof val !== "string" || !["true", "false"].includes(val)) {
    val;
    throw new Error(`Invalid Boolean field: ${key}=${val}`);
  }

  return val === "true";
};

const parseNumber = (key: string, val: unknown) => {
  if (typeof val === "number") {
    return val;
  }

  if (typeof val !== "string" || Number.isNaN(Number.parseInt(val))) {
    throw new Error(`Invalid Number field: ${key}=${val}`);
  }

  return Number.parseInt(val);
};

function getValue(key: string): string;
function getValue<K>(key: string, fn: (key: string, val?: string) => K): K;
function getValue<K>(key: string, fn?: (key: string, val?: string) => K): any {
  const envVar = process.env[key] || "";

  if (typeof fn !== "undefined") {
    return fn(key, envVar);
  }

  return envVar;
}

function withDefault(key: string, def: string): string;
function withDefault<K>(key: string, def: K, fn: (key: string, val?: string) => K): K;
function withDefault<K>(key: string, def: any, fn?: (key: string, val?: string) => K): any {
  const value = getValue(key) ?? def;

  return fn ? fn(key, value) : value;
}

const validLogLevels = ["silly", "trace", "debug", "info", "warn", "error", "fatal"];
const validProviders = ["docker", "traefik"];

const withAllowedValues = (allowed: string[]) => (key: string, val?: string) => {
  if (!val || !allowed.includes(val)) {
    throw new Error(`Invalid ${key}=${val}. Must be one of: ${allowed.join(", ")}`);
  }
  return val;
};

const provider = withDefault("PROVIDER", "docker", withAllowedValues(validProviders));

export default {
  cloudflareZoneId: throwIfUndefined("CLOUDFLARE_ZONE_ID"),
  cloudflareApiToken: throwIfUndefined("CLOUDFLARE_API_TOKEN"),
  cloudflareTunnelUrl: getValue<string>("CLOUDFLARE_TUNNEL_URL", (key, val) => {
    if (!val) {
      throw new Error("CLOUDFLARE_TUNNEL_URL is required");
    }

    if (val?.startsWith("http")) {
      throw new Error("Tunnel url cannot contain the protocol. Remove http/https");
    }

    if (!val?.endsWith("cfargotunnel.com")) {
      throw new Error("Tunnel url must end in cfargotunnel.com");
    }

    return val;
  }),
  dockerLabelHostname: withDefault("DOCKER_LABEL_HOSTNAME", "angelos.hostname"),
  dockerLabelEnable: withDefault("DOCKER_LABEL_ENABLE", "angelos.enabled"),
  logLevel: withDefault("LOG_LEVEL", "info", withAllowedValues(validLogLevels)) as TLogLevelName,
  dryRun: withDefault("DRY_RUN", false, parseBoolean),
  deleteDnsRecordDelay: withDefault("DELETE_DNS_RECORD_DELAY", 60 * 5, parseNumber),
  addDnsRecordDelay: withDefault("ADD_DNS_RECORD_DELAY", 60 * 1, parseNumber),
  provider,
  traefikApiUrl: getValue("TRAEFIK_API_URL", (key, val) => {
    if (provider === "traefik" && !val) {
      throw new Error(`${key} is required when provider=traefik`);
    }

    return val;
  }),
  traefikPollInterval: withDefault("TRAEFIK_POLL_INTERVAL", 60 * 10, parseNumber),
};
