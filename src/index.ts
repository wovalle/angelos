import { main as syncResources } from "./operations";
import { Logger } from "tslog";

import { makeScheduler } from "./scheduler";
import { version } from "../package.json";
import env from "./env";
import { CloudflareApi } from "./cloudflare";
import { DockerApi } from "./docker";

const logger = new Logger({
  setCallerAsLoggerName: true,
  displayFilePath: "hidden",
  displayFunctionName: false,
  minLevel: env.logLevel,
});

const cloudflareClient = new CloudflareApi(logger.getChildLogger({ name: "CloudflareApi" }));

const dockerClient = new DockerApi(logger.getChildLogger({ name: "DockerApi" }));

const scheduler = makeScheduler(logger.getChildLogger({ name: "Scheduler" }));

logger.info(`Init angelos ${version}`);
logger.info(`Dry Run=${env.dryRun}`);
logger.info(`Log Level=${env.logLevel}`);
logger.info(`Delete DNS Record Delay=${env.deleteDnsRecordDelay}`);
logger.info(`Add DNS Record Delay=${env.addDnsRecordDelay}`);
// Test your external dependencies
// Subscribe to container changes

// Call SyncResources once
const syncResourcesJob = syncResources({
  logger: logger.getChildLogger({ name: "SyncResources" }),
  scheduler,
  cloudflareClient,
  dockerClient,
  deleteDnsRecordDelay: env.deleteDnsRecordDelay,
  addDnsRecordDelay: env.addDnsRecordDelay,
});

// Schedule SyncResources each hour
scheduler.scheduleIntervalJob({
  type: "PullResources",
  jobId: "Pull Resources",
  fn: () => syncResourcesJob,
  intervalTimeInSeconds: 60 * 60,
});