import { makeOperations } from "./operations";

import { version } from "../package.json";
import { env, getDockerEnv, getTraefikEnv } from "./env";
import { makeScheduler } from "./scheduler";

import { logger } from "./lib/logger";
import { DockerClient } from "./providers/docker";
import { TraefikClient } from "./providers/traefik";
import { CloudflareApi } from "./targets/cloudflare";

const cloudflareClient = new CloudflareApi(logger.getSubLogger({ name: "CloudflareApi" }));

const scheduler = makeScheduler(logger.getSubLogger({ name: "Scheduler" }));

const providerClient =
  env.PROVIDER === "docker"
    ? new DockerClient(logger.getSubLogger({ name: "DockerClient" }))
    : new TraefikClient(logger.getSubLogger({ name: "TraefikClient" }));

const { syncResources, scheduleAddDnsRecord, scheduleDeleteDnsRecord } = makeOperations({
  logger: logger.getSubLogger({ name: "SyncResources" }),
  scheduler,
  cloudflareClient,
  providerClient,
  deleteDnsRecordDelay: env.DELETE_DNS_RECORD_DELAY,
  addDnsRecordDelay: env.ADD_DNS_RECORD_DELAY,
});

(async () => {
  logger.info(`Init angelos ${version}`);
  logger.info(`Dry Run=${env.DRY_RUN}`);
  logger.info(`Log Level=${env.LOG_LEVEL}`);
  logger.info(`Delete DNS Record Delay=${env.DELETE_DNS_RECORD_DELAY}`);
  logger.info(`Add DNS Record Delay=${env.ADD_DNS_RECORD_DELAY}`);
  logger.info(`Provider=${env.PROVIDER}`);

  // TODO: move to provider.setup()
  if (env.PROVIDER === "docker") {
    const dockerEnv = getDockerEnv();
    logger.info(`Docker Label Hostname=${dockerEnv.DOCKER_LABEL_HOSTNAME}`);
    logger.info(`Docker Label Enable=${dockerEnv.DOCKER_LABEL_ENABLE}`);
  } else {
    const traefikEnv = getTraefikEnv();
    logger.info(`Traefik Api Url=${traefikEnv.TRAEFIK_API_URL}`);
    logger.info(`Traefik Poll Interval=${traefikEnv.TRAEFIK_POLL_INTERVAL}`);
  }

  // Test your external dependencies
  logger.info(`Test connection of Provider=${env.PROVIDER}`);
  await providerClient.testConnection();
  logger.info(`Test connection of Cloudflare`);
  await cloudflareClient.testConnection();

  // Subscribe to provider changes
  providerClient.subscribeToChanges({ scheduleAddDnsRecord, scheduleDeleteDnsRecord, scheduler });

  // Call SyncResources once
  await syncResources();

  // Schedule SyncResources each hour
  scheduler.scheduleIntervalJob({
    type: "PullResources",
    jobId: "Sync Resources",
    fn: syncResources,
    intervalTimeInSeconds: 60 * 60,
  });
})();
