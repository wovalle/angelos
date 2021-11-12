import { TLogLevelName } from "tslog";
import { pipeInto } from "ts-functional-pipe";

export enum Provider {
  Docker = "docker",
  Traefik = "traefik",
}

export enum LogLevel {
  Silly = "silly",
  Trace = "trace",
  Debug = "debug",
  Info = "info",
  Warn = "warn",
  Error = "error",
  Fatal = "fatal",
}

type TEnvVarObj<T = string | undefined> = { key: string; val: T };

export const required = (obj: TEnvVarObj) => {
  if (!obj.val) {
    throw new Error(`Environment Variable ${obj.key} was not found`);
  }

  return obj as { key: string; val: string };
};

export const toBool = ({ key, val }: TEnvVarObj) => {
  if (typeof val === "boolean") {
    return val;
  }

  if (typeof val !== "string" || !["true", "false"].includes(val)) {
    val;
    throw new Error(`Invalid Boolean field: ${key}=${val}`);
  }

  return { key, val: val === "true" };
};

export const toNumber = ({ key, val }: TEnvVarObj) => {
  if (typeof val === "number") {
    return val;
  }

  if (typeof val !== "string" || Number.isNaN(Number.parseInt(val))) {
    throw new Error(`Invalid Number field: ${key}=${val}`);
  }

  return { key, val: Number.parseInt(val) };
};

export function getEnvVar(key: string): TEnvVarObj {
  return { key, val: process.env[key] };
}

export const def =
  <T>(def: T) =>
  ({ key, val }: TEnvVarObj) => ({ key, val: val ?? def });

export const allowed =
  <T>(allowed: T) =>
  ({ key, val }: TEnvVarObj) => {
    const values = Object.values(allowed);
    if (!val || !values.includes(val)) {
      throw new Error(`Invalid ${key}=${val}. Must be one of: ${values.join(", ")}`);
    }
    return { key, val };
  };

const validateTraefikApiUrl =
  (provider: Provider) =>
  ({ key, val }: TEnvVarObj) => {
    if (provider === Provider.Traefik && !val) {
      throw new Error(`${key} is required when PROVIDER=traefik`);
    }
    return { key, val };
  };

const validateCloudflareTunnelUrl = ({ key, val }: TEnvVarObj) => {
  if (val?.startsWith("http")) {
    throw new Error(`${key} cannot contain the protocol. Remove http/https`);
  }

  if (!val?.endsWith("cfargotunnel.com")) {
    throw new Error(`${key} must end in cfargotunnel.com`);
  }

  return { val, key };
};

export const getEnvVars = () => {
  const provider = pipeInto(getEnvVar("PROVIDER"), def("docker"), allowed(Provider))
    .val as Provider;

  return {
    cloudflareZoneId: pipeInto(getEnvVar("CLOUDFLARE_ZONE_ID"), required).val,
    cloudflareApiToken: pipeInto(getEnvVar("CLOUDFLARE_API_TOKEN"), required).val,
    cloudflareTunnelUrl: pipeInto(
      getEnvVar("CLOUDFLARE_TUNNEL_URL"),
      required,
      validateCloudflareTunnelUrl
    ).val,
    dockerLabelHostname: pipeInto(getEnvVar("DOCKER_LABEL_HOSTNAME"), def("angelos.hostname")).val,
    dockerLabelEnable: pipeInto(getEnvVar("DOCKER_LABEL_ENABLE"), def("angelos.enabled")).val,
    logLevel: pipeInto(getEnvVar("LOG_LEVEL"), def("info"), allowed(LogLevel)).val as TLogLevelName,
    dryRun: pipeInto(getEnvVar("DOCKER_LABEL_ENABLE"), def("false"), toBool),
    deleteDnsRecordDelay: pipeInto(getEnvVar("DELETE_DNS_RECORD_DELAY"), def(`${60 * 5}`), toNumber)
      .val,
    addDnsRecordDelay: pipeInto(getEnvVar("ADD_DNS_RECORD_DELAY"), def(`${60 * 1}`), toNumber).val,
    provider,
    traefikApiUrl: pipeInto(getEnvVar("TRAEFIK_API_URL"), validateTraefikApiUrl(provider)).val,
    traefikPollInterval: pipeInto(getEnvVar("TRAEFIK_POLL_INTERVAL"), def(`${60 * 10}`), toNumber)
      .val,
  };
};



