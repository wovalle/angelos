import { makeOperations } from "./operations";
import { Logger } from "tslog";

import { makeScheduler } from "./scheduler";
import { version } from "../package.json";
import { getEnvVars } from "./env";
import { CloudflareApi } from "./targets";
import { DockerClient } from "./serviceProviders/docker";
import { TraefikClient } from "./serviceProviders/traefik";

const env = getEnvVars();

const logger = new Logger({
  setCallerAsLoggerName: true,
  displayFilePath: "hidden",
  displayFunctionName: false,
  minLevel: env.logLevel,
  name: "main",
});

const cloudflareClient = new CloudflareApi(logger.getChildLogger({ name: "CloudflareApi" }));

const scheduler = makeScheduler(logger.getChildLogger({ name: "Scheduler" }));

const providerClient =
  env.provider === "docker"
    ? new DockerClient(logger.getChildLogger())
    : new TraefikClient(logger.getChildLogger());

const { syncResources, scheduleAddDnsRecord, scheduleDeleteDnsRecord } = makeOperations({
  logger: logger.getChildLogger({ name: "SyncResources" }),
  scheduler,
  cloudflareClient,
  providerClient,
  deleteDnsRecordDelay: env.deleteDnsRecordDelay,
  addDnsRecordDelay: env.addDnsRecordDelay,
});

(async () => {
  logger.info(`Init angelos ${version}`);
  logger.info(`Dry Run=${env.dryRun}`);
  logger.info(`Log Level=${env.logLevel}`);
  logger.info(`Delete DNS Record Delay=${env.deleteDnsRecordDelay}`);
  logger.info(`Add DNS Record Delay=${env.addDnsRecordDelay}`);
  logger.info(`Provider=${env.provider}`);

  if (env.provider === "docker") {
    logger.info(`Docker Label Hostname=${env.dockerLabelHostname}`);
    logger.info(`Docker Label Enable=${env.dockerLabelEnable}`);
  } else {
    logger.info(`Traefik Api Url=${env.traefikApiUrl}`);
    logger.info(`Traefik Poll Interval=${env.traefikPollInterval}`);
  }

  // Test your external dependencies
  logger.info(`Test connection of Provider=${env.provider}`);
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
