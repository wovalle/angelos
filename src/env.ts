import * as z from "zod";

// TODO: dynamically load providers
const validProviders = z.enum(["docker", "traefik"]);
const validTargets = z.enum(["cloudflareDNS"]);

const validExternalEnv = z.union([validProviders, validTargets]);

const baseEnvSchema = z.object({
  PROVIDER: validProviders,
  LOG_LEVEL: z.enum(["silly", "trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  DRY_RUN: z.boolean().default(false),
  DELETE_DNS_RECORD_DELAY: z.number().default(300),
  ADD_DNS_RECORD_DELAY: z.number().default(60),
});

const cloudflareDNSSchema = z.object({
  CLOUDFLARE_ZONE_ID: z.string(),
  CLOUDFLARE_API_TOKEN: z.string(),
  CLOUDFLARE_TUNNEL_UUID: z.string().uuid(),
});

const dockerSchema = z.object({
  DOCKER_LABEL_HOSTNAME: z.string().default("angelos.hostname"),
  DOCKER_LABEL_ENABLE: z.string().default("angelos.enabled"),
});

const traefikSchema = z.object({
  TRAEFIK_API_URL: z.string().url(),
  TRAEFIK_POLL_INTERVAL: z.number().default(600),
});

export const env = baseEnvSchema.parse(process.env);

// can we make this more generic?
export const getCloudflareDNSEnv = () => cloudflareDNSSchema.parse(process.env);
export const getDockerEnv = () => dockerSchema.parse(process.env);
export const getTraefikEnv = () => traefikSchema.parse(process.env);
