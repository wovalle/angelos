import { createServer } from "http"
import next from "next"
import { parse } from "url"
import { DbService } from "../db/db"
import { env } from "../env"
import { SystemSummary } from "../lib/getSystemSummary"
import { Logger } from "../lib/logger"

export const initWebServer = async (opts: {
  getSummary: () => SystemSummary
  db: DbService
  logger: Logger
}) => {
  const { getSummary, db, logger } = opts
  const dev = env.NODE_ENV !== "production"

  const app = next({ dev, dir: __dirname })
  const handle = app.getRequestHandler()

  await app
    .prepare()
    .then(() => {
      createServer((req, res) => {
        const parsedUrl = parse(req.url!, true)
        // @ts-expect-error
        req.angelos = { getSummary, db, logger }
        handle(req, res, parsedUrl)
      }).listen(env.UI_PORT)

      logger.info(
        `Server listening at http://localhost:${env.UI_PORT} as ${
          dev ? "development" : env.NODE_ENV
        }`
      )
    })
    .catch((err) => {
      logger.error(err)
      process.exit(1)
    })
}
