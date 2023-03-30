import { Logger } from "../lib/logger";
import { Target } from "../types";
import { CloudflareDNSTarget } from "./cloudflareLegacy";

export const getActiveTargets = async (logger: Logger) => {
  const targets: Target[] = [];

  if (process.env.CLOUDFLARE_TUNNEL_UUID) {
    const cloudflareDNS = new CloudflareDNSTarget(logger);

    targets.push(cloudflareDNS);
  }

  for (const t of targets) {
    await t.setup();
  }

  return targets;
};
