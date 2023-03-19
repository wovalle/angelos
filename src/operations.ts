import { Logger } from "./lib/logger";
import { Scheduler } from "./scheduler";
import { Host, HostChange, Provider, Target } from "./types";

type OperationParams = {
  logger: Logger;
  scheduler: Scheduler;
  providers: Provider[];
  targets: Target[];
};

export const makeOperations = (opts: OperationParams) => {
  const diff = (providerHosts: Host[], targetHosts: Host[]): HostChange[] => {
    const recordsInProviderButNotInTarget = providerHosts
      .filter((h) => !targetHosts.find((t) => h.name === t.name))
      .map(
        (host) =>
          ({
            type: "add",
            host,
          } satisfies HostChange)
      );

    logger.debug("[recordsInProviderButNotInTarget]", recordsInProviderButNotInTarget);

    const recordsInTargetButNotInProvider = targetHosts
      .filter((h) => !providerHosts.find((t) => t.name === h.name))
      .map((h) => ({ type: "remove", host: h } satisfies HostChange));

    logger.debug("[recordsInTargetButNotInProvider]", recordsInTargetButNotInProvider);

    return [...recordsInProviderButNotInTarget, ...recordsInTargetButNotInProvider];
  };

  const { providers, targets, logger } = opts;

  const syncResources = async () => {
    const hostsInTarget = new Map<Target, Host[]>();

    for (const t of targets) {
      const hosts = await t.getHosts();

      hostsInTarget.set(t, hosts);
    }

    for (const provider of providers) {
      const providerHosts = await provider.getHosts();

      for (const [target, targetHosts] of hostsInTarget) {
        const changesForProvider = diff(providerHosts, targetHosts);

        if (changesForProvider.length) {
          logger.info(
            `About to apply ${changesForProvider.length} changes to ${target.getName()}:`
          );

          changesForProvider.forEach((c) => logger.info(`- ${c.type} ${c.host.name}`));

          await target.apply(changesForProvider);
        }
      }
    }
  };

  return {
    syncResources,
  };
};
