import { makeOperations } from "./operations";
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

const { syncResources, scheduleAddDnsRecord, scheduleDeleteDnsRecord } = makeOperations({
  logger: logger.getChildLogger({ name: "SyncResources" }),
  scheduler,
  cloudflareClient,
  dockerClient,
  deleteDnsRecordDelay: env.deleteDnsRecordDelay,
  addDnsRecordDelay: env.addDnsRecordDelay,
});

logger.info(`Init angelos ${version}`);
logger.info(`Dry Run=${env.dryRun}`);
logger.info(`Log Level=${env.logLevel}`);
logger.info(`Delete DNS Record Delay=${env.deleteDnsRecordDelay}`);
logger.info(`Add DNS Record Delay=${env.addDnsRecordDelay}`);

// Test your external dependencies
// await dockerClient.testConnection()
// await cloudflareClient.testConnection()
// Subscribe to container changes

dockerClient.subscribeToChanges((eventType, host) => {
  switch (eventType) {
    case "AddDnsRecord": {
      scheduleAddDnsRecord(host);
    }
    case "DeleteDnsRecord": {
      scheduleDeleteDnsRecord(host);
    }
  }
});

// Call SyncResources once
const syncResourcesJob = syncResources();

// Schedule SyncResources each hour
scheduler.scheduleIntervalJob({
  type: "PullResources",
  jobId: "Pull Resources",
  fn: () => syncResourcesJob,
  intervalTimeInSeconds: 60 * 60,
});
