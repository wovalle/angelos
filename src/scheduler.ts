import { Logger } from "tslog";

type Job = {
  type: JobType;
  jobId: string;
  timerId: NodeJS.Timeout;
};

type JobType = "AddDnsRecord" | "RemoveDnsRecord";

const makeScheduler = (logger: Logger, deleteRecordDelayInSeconds: number) => {
  const jobsRegistry: Map<string, Job> = new Map();

  return {
    scheduleJob: (opts: { type: JobType; jobId: string; fn: Function }) => {
      const timerId = setTimeout(async () => {
        jobsRegistry.delete(opts.jobId);
        await opts.fn();
      }, deleteRecordDelayInSeconds * 1000);

      jobsRegistry.set(opts.jobId, { type: opts.type, jobId: opts.jobId, timerId });
      logger.info("[Schedule Job]", opts.type, `Job with id="${opts.jobId}" has been scheduled`);
    },

    removeJobIfExists: (opts: { type: JobType; jobId: string }) => {
      const job = jobsRegistry.get(opts.jobId);

      if (!job) {
        return;
      }

      clearTimeout(job.timerId);
      jobsRegistry.delete(opts.jobId);
      logger.info("[Remove Job]", opts.type, `Job with id="${opts.jobId}" has been removed`);
    },
    getJobs: () => jobsRegistry,
  };
};

export { makeScheduler };