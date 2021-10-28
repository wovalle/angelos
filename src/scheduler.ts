import { Logger } from "tslog";

type Job = {
  type: JobType;
  id: string;
  jobId: NodeJS.Timeout;
};

type JobType = "AddDnsRecord" | "RemoveDnsRecord";
export class Scheduler {
  deleteRecordDelayInSeconds: number;
  jobsRegistry: Map<string, Job> = new Map();

  constructor(deleteRecordDelayInSeconds: number, private logger: Logger) {
    this.deleteRecordDelayInSeconds = deleteRecordDelayInSeconds;
  }

  addJob = (type: JobType, id: string, fn: Function) => {
    const jobId = setTimeout(async () => {
      this.jobsRegistry.delete(id);
      await fn();
    }, this.deleteRecordDelayInSeconds);

    this.jobsRegistry.set(id, { type, id, jobId });
    this.logger.info("[Add Job] Added job type");
  };

  removeJobIfExists = (type: JobType, id: string) => {
    const job = this.jobsRegistry.get(id);

    if (!job) {
      return;
    }

    clearTimeout(job.jobId);
    this.jobsRegistry.delete(id);
    this.logger.info("[Remove Job]", type, `Job id "${id}" has been removed`);
  };
}
