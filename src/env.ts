import * as z from "zod";

// TODO: dynamically load providers
const validProviders = z.enum(["docker", "traefik"]);
const validTargets = z.enum(["cloudflareDNS"]);

const validExternalEnv = z.union([validProviders, validTargets]);

const baseEnvSchema = z.object({
  PROVIDER: validProviders,
  LOG_LEVEL: z.enum(["silly", "trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  DRY_RUN: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  DELETE_DNS_RECORD_DELAY: z.string().default("300").transform(Number),
  ADD_DNS_RECORD_DELAY: z.string().default("60").transform(Number),
});

const cloudflareDNSSchema = z.object({
  CLOUDFLARE_DNS_ZONE_ID: z.string(),
  CLOUDFLARE_DNS_API_TOKEN: z.string(),
  CLOUDFLARE_DNS_TUNNEL_UUID: z.string().uuid(),
});

const dockerSchema = z.object({
  DOCKER_LABEL_HOSTNAME: z.string().default("angelos.hostname"),
  DOCKER_LABEL_ENABLE: z.string().default("angelos.enabled"),
});

const traefikSchema = z.object({
  TRAEFIK_API_URL: z.string().url(),
  TRAEFIK_POLL_INTERVAL: z.string().default("600").transform(Number),
});

export const env = baseEnvSchema.parse(process.env);

// can we make this more generic?
export const getCloudflareDNSEnv = () => cloudflareDNSSchema.parse(process.env);
export const getDockerEnv = () => dockerSchema.parse(process.env);
export const getTraefikEnv = () => traefikSchema.parse(process.env);
