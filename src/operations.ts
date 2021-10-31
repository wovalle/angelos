import { DNSRecord } from "@cloudflare/types";
import type { Logger } from "tslog";
import type { CloudflareApi } from "./cloudflare";
import type { DockerApi } from "./docker";

import { Scheduler } from "./scheduler";
import { throwFatal } from "./utils";

const diff = (cfRecords: DNSRecord[], dockerHostNames: string[]) => {
  return {
    recordsInCloudflareButNotDocker: cfRecords.filter((r) => !dockerHostNames.includes(r.name)),
    recordsInDockerButNotCloudFlare: dockerHostNames.filter(
      (h) => !cfRecords.find((r) => r.name === h)
    ),
  };
};

export const main = async ({
  logger,
  scheduler,
  cloudflareClient,
  dockerClient,
  addDnsRecordDelay,
  deleteDnsRecordDelay,
}: {
  logger: Logger;
  scheduler: Scheduler;
  cloudflareClient: CloudflareApi;
  dockerClient: DockerApi;
  addDnsRecordDelay: number;
  deleteDnsRecordDelay: number;
}) => {
  const cloudflareRecords = await cloudflareClient
    .fetchCNameRecords()
    .catch((e) => throwFatal(logger, e));

  const dcHosts = await dockerClient.getDockerContainerHosts();

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
        delayInSeconds: addDnsRecordDelay,
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
        delayInSeconds: deleteDnsRecordDelay,
      });
    });
  }
};

export const pollChanges = async () => {};
