import { DbService } from "../db/db"
import { env } from "../env"
import { Scheduler } from "../scheduler"
import { Provider, Target } from "../types"

export const getSummary = (opts: {
  upSince: Date
  db: DbService
  scheduler: Scheduler
  version: string
  providers: Provider[]
  targets: Target[]
}) => {
  const providers = opts.providers.map((p) => ({
    name: p.getName(),
  }))

  const targets = opts.targets.map((t) => ({
    name: t.getName(),
  }))

  const pendingJobs = opts.scheduler.getJobs().map(({ timerId, ...rest }) => rest)

  return {
    upSince: opts.upSince.toISOString(),
    pendingJobs,
    providers,
    targets,
    env,
    version: opts.version,
  }
}

export type SystemSummary = ReturnType<typeof getSummary>
