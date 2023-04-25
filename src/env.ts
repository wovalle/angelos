import * as z from "zod"

const baseEnvSchema = z.object({
  LOG_LEVEL: z.enum(["silly", "trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  DRY_RUN: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  DELETE_DNS_RECORD_DELAY: z.string().default("300").transform(Number),
  ADD_DNS_RECORD_DELAY: z.string().default("60").transform(Number),
  DB_ENABLED: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
  UI_ENABLED: z
    .string()
    .default("true")
    .transform((v) => v === "true"),

  UI_PORT: z.string().default("3000").transform(Number),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
})

const cloudflareLegacySchema = z.object({
  CLOUDFLARE_DNS_ZONE_ID: z.string(),
  CLOUDFLARE_DNS_API_TOKEN: z.string(),
  CLOUDFLARE_DNS_TUNNEL_UUID: z.string().uuid(),
})

const cloudflareTunnelSchema = z.object({
  CLOUDFLARE_TUNNEL_JWT: z.string(),
  CLOUDFLARE_TUNNEL_API_TOKEN: z.string(),
  CLOUDFLARE_TUNNEL_ZONE_ID: z.string(),
  // TODO: need to rethink this, how am I routing traffic in the tunnel?
  CLOUDFLARE_TUNNEL_TARGET_SERVICE: z.string(),
})

const dockerSchema = z.object({
  DOCKER_LABEL_HOSTNAME: z.string().default("angelos.hostname"),
  DOCKER_LABEL_ENABLE: z.string().default("angelos.enabled"),
})

const traefikSchema = z.object({
  TRAEFIK_API_URL: z.string().url(),
  TRAEFIK_POLL_INTERVAL: z.string().default("600").transform(Number),
})

export const env = baseEnvSchema.parse(process.env)

// can we make this more generic?
export const getCloudflareLegacyEnv = () => cloudflareLegacySchema.parse(process.env)
export const getCloudflareTunnelEnv = () => cloudflareTunnelSchema.parse(process.env)
export const getDockerEnv = () => dockerSchema.parse(process.env)
export const getTraefikEnv = () => traefikSchema.parse(process.env)
