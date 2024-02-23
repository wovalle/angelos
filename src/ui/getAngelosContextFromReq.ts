import { NextIncomingMessage } from "next/dist/server/request-meta"
import { DbService } from "../db/db"
import { SystemSummary } from "../lib/getSystemSummary"

type AngelosContext = {
  getSummary: () => SystemSummary
  db: DbService
}

export const getAngelosContextFromReq = (req: NextIncomingMessage) => {
  // @ts-expect-error
  return req.angelos as AngelosContext
}
