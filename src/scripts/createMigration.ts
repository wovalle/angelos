import * as fs from "node:fs"
import * as path from "node:path"

const defaultContent = `
import { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Migration code
}

export async function down(db: Kysely<any>): Promise<void> {
  // Migration code
}
`

// Get the command line arguments
const args: string[] = process.argv.slice(2)

if (args.length < 1) {
  console.error("Please provide a migration name")
  process.exit(1)
}

const isoDate = new Date()
  .toISOString()
  .slice(0, -1)
  .replace("T", "-")
  .replace(/:/g, "-")
  .replace(".", "-")

const migrationFileName = `${isoDate}_${args.join("_").replaceAll(" ", "_")}.ts`
const filePath = path.join(__dirname, "..", "db", "migrations", migrationFileName)

fs.writeFile(filePath, defaultContent, function (err) {
  if (err) throw err
  console.log("Migration created successfully")
})
