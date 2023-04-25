import BetterSqlite from "better-sqlite3"
import { Generated, Kysely, SqliteDialect } from "kysely"
import { join } from "node:path"
import { env } from "../env"
import { Logger, logger } from "../lib/logger"
import { JobWithOutTimerId } from "../scheduler"
import { runMigrations } from "./runMigrations"

const DEFAULT_PAGE_SIZE = 20

interface LogEntity {
  id: Generated<number>
  jobId: string
  jobType: string
  operationType?: string
  hostname: string
  timestamp: Generated<string>
  meta: string
}

type WithoutGenerated<T> = {
  [P in keyof T]: T[P] extends Generated<infer U> ? U : T[P]
}

export type Log = WithoutGenerated<LogEntity>

interface BetterSqlite {
  logs: LogEntity
}

export class DbService {
  private db!: Kysely<BetterSqlite>
  private static instance: DbService

  constructor(private logger: Logger) {
    // TODO: make this configurable
    const dbDir = join(process.cwd(), "rootfs", "angelos", "angelos.db")

    this.db = new Kysely<BetterSqlite>({
      dialect: new SqliteDialect({
        database: new BetterSqlite(dbDir),
      }),
    })
  }

  public async init() {
    if (!env.DB_ENABLED) return

    await runMigrations(this.db, this.logger.getSubLogger({ name: "Migrations" }))
    this.logger.info("Database Initialized")
  }

  public getLogs(page: number, pageSize: number = DEFAULT_PAGE_SIZE): Promise<Log[]> {
    if (!env.DB_ENABLED) return Promise.resolve([])

    return this.db
      .selectFrom("logs")
      .selectAll()
      .limit(pageSize)
      .offset(page * pageSize)
      .orderBy("id", "desc")
      .execute()
  }

  public async getLogsCount(): Promise<number> {
    if (!env.DB_ENABLED) return Promise.resolve(0)

    const query = await this.db
      .selectFrom("logs")
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .executeTakeFirstOrThrow()

    return query.count
  }

  public logJobExecution(j: JobWithOutTimerId) {
    if (!env.DB_ENABLED) return Promise.resolve()

    const meta = Object.assign({}, j.meta, { dryRun: env.DRY_RUN ?? undefined })

    return this.db
      .insertInto("logs")
      .values({
        jobId: j.jobId,
        jobType: j.type,
        operationType: j.meta?.type,
        hostname: j.meta?.hostName ?? "unknown",
        meta: JSON.stringify(meta),
      })
      .execute()
  }

  public static getInstance() {
    if (!DbService.instance) {
      DbService.instance = new DbService(logger.getSubLogger({ name: "DbService" }))
    }

    return DbService.instance
  }
}
