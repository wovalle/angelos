import type { Logger } from "tslog";

type Job = {
  type: JobType;
  jobId: string;
  timerId: NodeJS.Timeout;
};

type JobType = "AddDnsRecord" | "RemoveDnsRecord" | "PullResources" | "DockerEvents";

const makeScheduler = (logger: Logger, deleteRecordDelayInSeconds: number) => {
  const jobsRegistry: Map<string, Job> = new Map();

  return {
    scheduleJob: (opts: { type: JobType; jobId: string; fn: Function }) => {
      const timerId = setTimeout(async () => {
        logger.info("[Run Job]", opts.type, `Job with id="${opts.jobId}" has been executed`);

        jobsRegistry.delete(opts.jobId);
        await opts.fn();
      }, deleteRecordDelayInSeconds * 1000);

      jobsRegistry.set(opts.jobId, { type: opts.type, jobId: opts.jobId, timerId });
      logger.info("[Schedule Job]", opts.type, `Job with id="${opts.jobId}" has been scheduled`);
    },

    scheduleIntervalJob: (opts: {
      type: JobType;
      jobId: string;
      fn: Function;
      intervalTimeInSeconds: number;
    }) => {
      const timerId = setInterval(async () => {
        logger.info("[Run Job]", opts.type, `Job with id="${opts.jobId}" has been executed`);
        await opts.fn();
      }, opts.intervalTimeInSeconds);

      jobsRegistry.set(opts.jobId, { type: opts.type, jobId: opts.jobId, timerId });

      logger.info(
        "[Schedule Interval Job]",
        opts.type,
        `Job with id="${opts.jobId}" has been scheduled`
      );
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

type Scheduler = ReturnType<typeof makeScheduler>;

export { makeScheduler, Scheduler };
