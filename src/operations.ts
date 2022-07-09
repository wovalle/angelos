import { DNSRecord } from "@cloudflare/types";
import type { Logger } from "tslog";
import type { CloudflareApi } from "./cloudflare";

import { Scheduler } from "./scheduler";
import { IMetadataProvider } from "./types";
import { throwFatal } from "./utils";

type OperationParams = {
  logger: Logger;
  scheduler: Scheduler;
  cloudflareClient: CloudflareApi;
  providerClient: IMetadataProvider;
  addDnsRecordDelay: number;
  deleteDnsRecordDelay: number;
};

const diff = (cfRecords: DNSRecord[], providerHostNames: string[]) => {
  return {
    recordsInCloudflareButNotInProvider: cfRecords
      .filter((r) => !providerHostNames.includes(r.name))
      .map(({ id, name }) => ({ id, name })),
    recordsInProviderButNotCloudFlare: providerHostNames.filter(
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
    const { cloudflareClient, providerClient, logger } = opts;

    const cloudflareRecords = await cloudflareClient
      .fetchCNameRecords()
      .catch((e) => throwFatal(logger, e));

    const providerHosts = await providerClient.getHosts();

    const { recordsInCloudflareButNotInProvider, recordsInProviderButNotCloudFlare } = diff(
      cloudflareRecords,
      providerHosts
    );

    /**
     * If apps were found in docker and are not present in cloudflare
     * it means that we have to create the dns records in cloudflare
     */
    if (recordsInProviderButNotCloudFlare.length) {
      recordsInProviderButNotCloudFlare.forEach((r) => scheduleAddDnsRecord(r));
    }

    /**
     * If apps were found in Cloudflare but are not in docker
     * it means that we have to delete the dns records
     */
    if (recordsInCloudflareButNotInProvider) {
      recordsInCloudflareButNotInProvider.forEach(({ id, name }) => {
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
