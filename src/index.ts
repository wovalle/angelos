import { main as syncResources } from "./operations";
import { Logger } from "tslog";

import { makeScheduler } from "./scheduler";
import { version } from "../package.json";
import env from "./env";
import { CloudflareApi } from "./cloudflare";
import { DockerApi } from "./docker";
import axios from "axios";
import { nanoid } from "nanoid";

const logger = new Logger({
  setCallerAsLoggerName: true,
  displayFilePath: "hidden",
  displayFunctionName: false,
  minLevel: env.logLevel,
});

const cloudflareClient = new CloudflareApi(
  logger.getChildLogger({ name: "CloudflareApi" }),
  env.cloudflareApiToken,
  env.cloudflareZoneId,
  env.cloudflareTunnelUrl
);

const dockerClient = new DockerApi(
  logger.getChildLogger({ name: "DockerApi" }),
  env.dockerSock,
  env.dockerApiHost,
  env.dockerLabelHostname,
  env.dockerLabelEnable
);

const scheduler = makeScheduler(logger.getChildLogger({ name: "Scheduler" }), 1000 * 60 * 5);

logger.info(`Init angelos ${version}`);

// Test your external dependencies
// Subscribe to container changes

// Call SyncResources once
const syncResourcesJob = syncResources({
  logger: logger.getChildLogger({ name: "SyncResources" }),
  scheduler,
  cloudflareClient,
  dockerClient,
});

// Schedule SyncResources each hour
scheduler.scheduleIntervalJob({
  type: "PullResources",
  jobId: "Pull Resources",
  fn: () => syncResourcesJob,
  intervalTimeInSeconds: 60 * 60,
});