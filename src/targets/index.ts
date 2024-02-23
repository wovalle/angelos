import { Logger } from "../lib/logger"
import { Target } from "../types"
import { CloudflareDNSTarget } from "./cloudflareLegacy"
import { CloudflareTunnel } from "./cloudflareTunnel"

export const getActiveTargets = async (logger: Logger) => {
  const targets: Target[] = []

  if (process.env.CLOUDFLARE_TUNNEL_UUID) {
    const cloudflareDNS = new CloudflareDNSTarget(logger)

    targets.push(cloudflareDNS)
  }

  if (process.env.CLOUDFLARE_TUNNEL_JWT) {
    const cloudflareTunnel = new CloudflareTunnel(logger)

    // @ts-expect-error since we don't declare the meta type is unknown by default and it complains with cloudflare
    targets.push(cloudflareTunnel)
  }

  for (const t of targets) {
    await t.setup()
  }

  return targets
}
