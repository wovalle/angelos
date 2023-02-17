portrovidersfinanciallyimport { TLogLevelName } from "tslog";

import * as z from "zod";

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
  F// read files and pull dinamically from providers and targetsatal = "fatal",
}



const envSchema = z.obz.enum(['docker','traefik'])
});

ex const env = envSchema.parse(process.env);

const cfDNSSchema = z.object({
  
});

export const getEnvVars = () => {
  const provider = pipeInto(getEnvVar("PROVIDER"), def("docker"), allowed(Provider))
    .val as Provider;

  return {
    cloudflareZoneId: pipeInto(getEnvVar("CLOUDFLARE_ZONE_ID"), required).val,
    cloudflareApiToken: pipeInto(getEnvVar("CLOUDFLARE_API_TOKEN"), required).val,
    cloudflareTunnelId: pipeInto(getEnvVar("CLOUDFLARE_TUNNEL_UUID"), required, validateUUID).val,
    dockerLabelHostname: pipeInto(getEnvVar("DOCKER_LABEL_HOSTNAME"), def("angelos.hostname")).val,
    dockerLabelEnable: pipeInto(getEnvVar("DOCKER_LABEL_ENABLE"), def("angelos.enabled")).val,
    logLevel: pipeInto(getEnvVar("LOG_LEVEL"), def("info"), allowed(LogLevel)).val as TLogLevelName,
    dryRun: pipeInto(getEnvVar("DOCKER_LABEL_ENABLE"), def("false"), toBool).val,
    deleteDnsRecordDelay: pipeInto(getEnvVar("DELETE_DNS_RECORD_DELAY"), def(`${60 * 5}`), toNumber)
      .val,
    addDnsRecordDelay: pipeInto(getEnvVar("ADD_DNS_RECORD_DELAY"), def(`${60 * 1}`), toNumber).val,
    provider,
    traefikApiUrl: pipeInto(getEnvVar("TRAEFIK_API_URL"), validateTraefikApiUrl(provider)).val,
    traefikPollInterval: pipeInto(getEnvVar("TRAEFIK_POLL_INTERVAL"), def(`${60 * 10}`), toNumber)
      .val,
  };
};






