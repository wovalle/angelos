import { ILogObj, Logger as TSLogger } from "tslog"
import { env } from "../env"

enum LogLevel {
  silly,
  trace,
  debug,
  info,
  warn,
  error,
  fatal,
}

export const logger = new TSLogger<ILogObj>({
  hideLogPositionForProduction: true,
  minLevel: LogLevel[env.LOG_LEVEL],
})

export type Logger = typeof logger
