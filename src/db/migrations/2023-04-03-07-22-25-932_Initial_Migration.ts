import { Kysely, sql } from "kysely"

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("logs")
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("jobId", "varchar", (col) => col.notNull())
    .addColumn("jobType", "varchar", (col) => col.notNull())
    .addColumn("operationType", "varchar")
    .addColumn("hostname", "varchar", (col) => col.notNull())
    .addColumn("timestamp", "timestamp", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
    .addColumn("meta", "jsonb")
    .execute()

  await db.schema.createIndex("logs_timestamp").on("logs").column("timestamp").execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  db.schema.dropTable("logs")
}
