import { Scheduler } from "../scheduler";

type Host = string;

export interface IMetadataProvider {
  testConnection(): Promise<void>;
  getHosts(): Promise<Host[]>;
  subscribeToChanges(opts: {
    scheduleAddDnsRecord: (hostname: string) => void;
    scheduleDeleteDnsRecord: (hostname: string) => void;
    scheduler: Scheduler;
  }): void;
}

