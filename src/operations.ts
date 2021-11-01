import { DNSRecord } from "@cloudflare/types";
import type { Logger } from "tslog";
import type { CloudflareApi } from "./cloudflare";
import type { DockerApi } from "./docker";

import { Scheduler } from "./scheduler";
import { throwFatal } from "./utils";

type OperationParams = {
  logger: Logger;
  scheduler: Scheduler;
  cloudflareClient: CloudflareApi;
  dockerClient: DockerApi;
  addDnsRecordDelay: number;
  deleteDnsRecordDelay: number;
};

const diff = (cfRecords: DNSRecord[], dockerHostNames: string[]) => {
  return {
    recordsInCloudflareButNotDocker: cfRecords.filter((r) => !dockerHostNames.includes(r.name)),
    recordsInDockerButNotCloudFlare: dockerHostNames.filter(
      (h) => !cfRecords.find((r) => r.name === h)
    ),
  };
};

export const makeOperations = (opts: OperationParams) => {
  const scheduleAddDnsRecord = async (hostname: string) => {
    const { cloudflareClient, addDnsRecordDelay, scheduler } = opts;

    // If we have any pending deletions, get rid of 'em
    scheduler.removeJobIfExists({ type: "RemoveDnsRecord", jobId: hostname });

    scheduler.scheduleJob({
      type: "AddDnsRecord",
      jobId: hostname,
      fn: () => cloudflareClient.createCNameRecord(hostname),
      delayInSeconds: addDnsRecordDelay,
    });
  };

  const scheduleDeleteDnsRecord = async (hostname: string, id?: string) => {
    const { cloudflareClient, deleteDnsRecordDelay, scheduler, logger } = opts;

    scheduler.scheduleJob({
      type: "RemoveDnsRecord",
      jobId: hostname,
      fn: async () => {
        const recordId = id ? id : cloudflareClient.getDnsRecordIdFromHostname(hostname);

        if (!recordId) {
          logger.warn(
            "[Delete Cloudflare Record]",
            "[Aborted]",
            `Not enough information to delete the DNS record with name=${hostname}. It'll get removed in the next sync.`
          );
          return;
        }

        return cloudflareClient.deleteRecord(recordId);
      },
      delayInSeconds: deleteDnsRecordDelay,
    });
  };

  const syncResources = async () => {
    const { cloudflareClient, dockerClient, logger } = opts;

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
      recordsInDockerButNotCloudFlare.forEach((r) => scheduleAddDnsRecord(r));
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

        scheduleDeleteDnsRecord(name, id);
      });
    }
  };

  return {
    syncResources,
    scheduleAddDnsRecord,
    scheduleDeleteDnsRecord,
  };
};