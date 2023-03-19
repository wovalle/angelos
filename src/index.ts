import { version } from "../package.json";
import { env } from "./env";
import { makeScheduler } from "./scheduler";

import { logger } from "./lib/logger";
import { makeOperations } from "./operations";
import { getActiveProviders } from "./providers";
import { getActiveTargets } from "./targets";

const scheduler = makeScheduler(logger.getSubLogger({ name: "Scheduler" }));

(async () => {
  logger.info(`Init angelos ${version}`);
  logger.info(`Dry Run=${env.DRY_RUN}`);
  logger.info(`Log Level=${env.LOG_LEVEL}`);
  logger.info(`Remove operations delayDelay=${env.DELETE_DNS_RECORD_DELAY}`); // TODO: rename env vars
  logger.info(`Add Operations Delay=${env.ADD_DNS_RECORD_DELAY}`); // TODO: rename env vars

  const providers = await getActiveProviders(logger, scheduler);
  const targets = await getActiveTargets(logger);

  const { syncResources } = makeOperations({
    logger: logger.getSubLogger({ name: "Operations" }),
    scheduler,
    providers,
    targets,
  });

  // subscribe to changes
  for (const provider of providers) {
    provider.subscribe(() => {
      syncResources();
    });
  }

  // Schedule SyncResources each hour
  // TODO: customize interval time
  scheduler.scheduleIntervalJob({
    type: "PullResources",
    jobId: "Sync Resources",
    fn: syncResources,
    intervalTimeInSeconds: 60 * 60,
    triggerOnStart: true,
  });
})();
