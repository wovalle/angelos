import { DNSRecord } from "@cloudflare/types";
import axios from "axios";
import { Logger } from "tslog";

import { CloudflareApi } from "./cloudflare";
import { DockerApi } from "./docker";
import { makeScheduler } from "./scheduler";
import { version } from "../package.json";
import env from "./env";

const logger: Logger = new Logger({ setCallerAsLoggerName: true });

// TODO: WithChildLogger(name)
const diff = (cfRecords: DNSRecord[], dockerHostNames: string[]) => {
  return {
    recordsInCloudflareButNotDocker: cfRecords.filter((r) => !dockerHostNames.includes(r.name)),
    recordsInDockerButNotCloudFlare: dockerHostNames.filter(
      (h) => !cfRecords.find((r) => r.name === h)
    ),
  };
};

const throwFatal = (e: unknown, errorText?: string) => {
  logger.error();
  if (axios.isAxiosError(e)) {
    logger.error(e.response?.data);
  } else {
    logger.error(e);
  }
  const error = new Error(errorText);
  logger.fatal(error);
  throw error;
};

export const main = async () => {
  const cloudflareClient = new CloudflareApi(
    logger.getChildLogger({ name: "CloudflareApi" }),
    env.cloudflareApiToken,
    env.cloudflareZoneId,
    env.cloudflareTunnelUrl
  );

  const dockerClient = new DockerApi(
    logger.getChildLogger({ name: "DockerApi" }),
    env.dockerSock,
    env.dockerApiHost
  );
  // const scheduler = new Scheduler(logger.getChildLogger({ name: "Scheduler" }), 1000 * 60 * 5);
  const scheduler = makeScheduler(logger.getChildLogger({ name: "Scheduler" }), 1000 * 60 * 5);

  logger.info(`Init angelos ${version}`);

  // TODO: Test cloudflare
  // TODO: Test docker

  const cloudflareRecords = await cloudflareClient.fetchCNameRecords().catch((e) => throwFatal(e));
  const dockerContainers = await dockerClient.getContainers().catch((e) => throwFatal(e));

  const dcHosts = dockerContainers.map((m) => m.Labels[env.dockerLabel]);

  const { recordsInCloudflareButNotDocker, recordsInDockerButNotCloudFlare } = diff(
    cloudflareRecords,
    dcHosts
  );

  /**
   * If apps were found in docker and are not present in cloudflare
   * it means that we have to create the dns records in cloudflare
   */
  if (recordsInDockerButNotCloudFlare.length) {
    recordsInDockerButNotCloudFlare.forEach((r) => {
      // If we have any pending deletions, get rid of 'em
      scheduler.removeJobIfExists({ type: "RemoveDnsRecord", jobId: r });

      scheduler.scheduleJob({
        type: "AddDnsRecord",
        jobId: r,
        fn: () => cloudflareClient.createCNameRecord(r),
      });
    });
  }

  /**
   * If apps were found in Cloudflare but are not in docker
   * it means that we have to delete the dns records
   */
  if (recordsInCloudflareButNotDocker) {
    recordsInCloudflareButNotDocker.forEach(({ id, name }) => {
      if (!id) {
        logger.error(`Cloudflare DNS record with name=${name} doesn't have an id`);
        return;
      }
      if (!name) {
        logger.error(`Cloudflare DNS record with id=${id} doesn't have a name`);
        return;
      }

      scheduler.scheduleJob({
        type: "RemoveDnsRecord",
        jobId: name,
        fn: () => cloudflareClient.deleteRecord(id),
      });
    });
  }
};
