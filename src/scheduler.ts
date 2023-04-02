import { Logger } from "./lib/logger"
import { logError } from "./utils"

// TODO: https://github.com/jakubroztocil/rrule
type JobType = "SyncResources" | "TraefikEvents" | "ApplyChanges"

export type Job = {
  type: JobType
  jobId: string
  timerId: NodeJS.Timeout
  meta: Record<string, string>
}

type ScheduleJobParams = {
  type: JobType
  jobId: string
  fn: (...args: any[]) => Promise<void>
  delayInSeconds: number
  meta?: Record<string, string>
}

const makeScheduler = (logger: Logger) => {
  const jobsRegistry: Map<string, Job> = new Map()

  const scheduleJob = (opts: ScheduleJobParams) => {
    const timerId = setTimeout(async () => {
      logger.info("[Run Job]", opts.type, `Job with id="${opts.jobId}" will be executed`)

      jobsRegistry.delete(opts.jobId)
      try {
        await opts.fn()
        logger.info(
          "[Run Job]",
          opts.type,
          `Job with id="${opts.jobId}" has been executed successfully `
        )
      } catch (e) {
        logger.error("[Run Job]", opts.type, `Job with id="${opts.jobId}" has failed`)

        logError(logger, e)
      }
    }, opts.delayInSeconds * 1000)

    jobsRegistry.set(opts.jobId, {
      type: opts.type,
      jobId: opts.jobId,
      timerId,
      meta: opts.meta ?? {},
    })

    logger.info(
      "[Schedule Job]",
      opts.type,
      `Job with id="${opts.jobId}" has been scheduled and will be executed in ${opts.delayInSeconds} seconds`
    )

    return timerId
  }

  return {
    scheduleJob,
    scheduleIntervalJob: (opts: {
      type: JobType
      jobId: string
      fn: Function
      intervalTimeInSeconds: number
      triggerOnStart?: boolean
      meta?: Record<string, string>
    }) => {
      const timerId = setInterval(async () => {
        logger.info("[Run Job]", opts.type, `Job with id="${opts.jobId}" has been executed`)
        await opts.fn()
      }, opts.intervalTimeInSeconds * 1000)

      if (opts.triggerOnStart) {
        logger.info("[Run Job]", opts.type, `Job with id="${opts.jobId}" has been executed`)
        opts.fn()
      }

      jobsRegistry.set(opts.jobId, {
        type: opts.type,
        jobId: opts.jobId,
        timerId,
        meta: opts.meta ?? {},
      })

      logger.info(
        "[Schedule Interval Job]",
        opts.type,
        `Job with id="${opts.jobId}" has been scheduled every ${opts.intervalTimeInSeconds} seconds`
      )
    },
    removeJobIfExists: (opts: { type: JobType; jobId: string }) => {
      const job = jobsRegistry.get(opts.jobId)

      if (!job || job.type !== opts.type) {
        return
      }

      clearTimeout(job.timerId)
      jobsRegistry.delete(opts.jobId)
      logger.info("[Remove Job]", opts.type, `Job with id="${opts.jobId}" has been aborted`)
    },
    getJobs: () => jobsRegistry,
  }
}

type Scheduler = ReturnType<typeof makeScheduler>

export { makeScheduler, Scheduler }
