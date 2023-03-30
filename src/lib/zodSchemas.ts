import { z } from "zod"

export const cloudflareTunnelConfigurationSchema = z.object({
  tunnel_id: z.string(),
  version: z.number(),
  config: z.object({
    ingress: z.array(
      z.object({
        service: z.string(),
        hostname: z.string().optional(),
      })
    ),
    "warp-routing": z.object({
      enabled: z.boolean(),
    }),
  }),
  source: z.string(),
  created_at: z.string(),
})

export type CloudflareTunnelConfiguration = z.infer<typeof cloudflareTunnelConfigurationSchema>
