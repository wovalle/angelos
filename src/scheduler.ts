import type { Logger } from "tslog";
import { logError } from "./utils";

type Job = {
  type: JobType;
  jobId: string;
  timerId: NodeJS.Timeout;
};

type JobType = "AddDnsRecord" | "RemoveDnsRecord" | "PullResources" | "DockerEvents";

const makeScheduler = (logger: Logger) => {
  const jobsRegistry: Map<string, Job> = new Map();

  return {
    scheduleJob: (opts: {
      type: JobType;
      jobId: string;
      fn: (...args: any[]) => Promise<void>;
      delayInSeconds: number;
    }) => {
      const timerId = setTimeout(async () => {
        logger.info("[Run Job]", opts.type, `Job with id="${opts.jobId}" will be executed`);

        jobsRegistry.delete(opts.jobId);
        try {
          await opts.fn();
          logger.info(
            "[Run Job]",
            opts.type,
            `Job with id="${opts.jobId}" has been executed successfully `
          );
        } catch (e) {
          logger.error("[Run Job]", opts.type, `Job with id="${opts.jobId}" has failed`);

          logError(logger, e);
        }
      }, opts.delayInSeconds * 1000);

      jobsRegistry.set(opts.jobId, { type: opts.type, jobId: opts.jobId, timerId });

      logger.info(
        "[Schedule Job]",
        opts.type,
        `Job with id="${opts.jobId}" has been scheduled and will be executed in ${opts.delayInSeconds} seconds`
      );
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
      }, opts.intervalTimeInSeconds * 1000);

      jobsRegistry.set(opts.jobId, { type: opts.type, jobId: opts.jobId, timerId });

      logger.info(
        "[Schedule Interval Job]",
        opts.type,
        `Job with id="${opts.jobId}" has been scheduled every ${opts.intervalTimeInSeconds} seconds`
      );
    },

    removeJobIfExists: (opts: { type: JobType; jobId: string }) => {
      const job = jobsRegistry.get(opts.jobId);

      if (!job) {
        return;
      }

      clearTimeout(job.timerId);
      jobsRegistry.delete(opts.jobId);
      logger.info("[Remove Job]", opts.type, `Job with id="${opts.jobId}" has been aborted`);
    },
    getJobs: () => jobsRegistry,
  };
};

type Scheduler = ReturnType<typeof makeScheduler>;

export { makeScheduler, Scheduler };
