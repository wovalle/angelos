import { ILogObj, Logger as TSLogger } from "tslog";
import { env } from "../env";

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
  hideLogPositionForProduction: false,
  minLevel: LogLevel[env.LOG_LEVEL],
  name: "main",
});

export type Logger = typeof logger;
