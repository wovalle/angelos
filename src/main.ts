import { version } from "../package.json"
import { env } from "./env"
import { makeScheduler } from "./scheduler"

import { DbService } from "./db/db"
import { getSummary } from "./lib/getSystemSummary"
import { logger as BaseLogger } from "./lib/logger"
import { makeOperations } from "./operations"
import { getActiveProviders } from "./providers"
import { getActiveTargets } from "./targets"
import { initWebServer } from "./ui/server"
const upSince = new Date()

;(async () => {
  const logger = BaseLogger.getSubLogger({ name: "Main" })

  logger.info(`Init angelos ${version}`)
  logger.info(`Dry Run=${env.DRY_RUN}`)
  logger.info(`Log Level=${env.LOG_LEVEL}`)
  logger.info(`Remove operations delayDelay=${env.DELETE_DNS_RECORD_DELAY}`)
  logger.info(`Add Operations Delay=${env.ADD_DNS_RECORD_DELAY}`)

  const scheduler = makeScheduler(logger.getSubLogger({ name: "Scheduler" }))

  const dbService = DbService.getInstance()
  await dbService.init()

  const providers = await getActiveProviders(logger)
  const targets = await getActiveTargets(logger)

  if (env.UI_ENABLED) {
    await initWebServer({
      getSummary: () =>
        getSummary({
          upSince,
          db: dbService,
          scheduler,
          version,
          providers,
          targets,
        }),
      db: DbService.getInstance(),
      logger: logger.getSubLogger({ name: "Web Server" }),
    })
  }

  // We want to log the parameters of apply changes
  scheduler.subscribe(async (j) => {
    if (j.type === "ApplyChanges") {
      dbService.logJobExecution(j)
    }
  })

  const { syncResources } = makeOperations({
    logger: logger.getSubLogger({ name: "Operations" }),
    scheduler,
    providers,
    targets,
    addTargetRecordDelay: env.ADD_DNS_RECORD_DELAY,
    removeTargetRecordDelay: env.DELETE_DNS_RECORD_DELAY,
  })

  // subscribe to changes
  for (const provider of providers) {
    provider.subscribe(scheduler, () => {
      syncResources()
    })
  }

  // Schedule SyncResources each hour
  // TODO: customize interval time
  scheduler.scheduleIntervalJob({
    type: "SyncResources",
    jobId: "Sync Resources Periodically",
    fn: syncResources,
    intervalTimeInSeconds: 60 * 60,
    triggerOnStart: true,
  })
})()
