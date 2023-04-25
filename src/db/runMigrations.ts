import { promises as fs } from "fs"
import { FileMigrationProvider, Kysely, Migrator } from "kysely"
import * as path from "path"

import { Logger } from "../lib/logger"

export async function runMigrations(db: Kysely<any>, logger: Logger) {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, "migrations"),
    }),
  })

  const { error, results } = await migrator.migrateToLatest()

  results?.forEach((it) => {
    if (it.status === "Success") {
      logger.info(`Migration "${it.migrationName}" was executed successfully`)
    } else if (it.status === "Error") {
      logger.error(`Failed to execute migration "${it.migrationName}"`)
    }
  })

  if (error) {
    logger.error("failed to migrate")
    logger.error(error)
    process.exit(1)
  }

  // await db.destroy()
}
