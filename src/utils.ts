import axios from "axios";
import type { Logger } from "tslog";

export const throwFatal = (logger: Logger, e: unknown, errorText?: string) => {
  logger.error();
  if (axios.isAxiosError(e)) {
    logger.error(e.response?.data);
  } else {
    logger.error(e);
  }
  const error = new Error(errorText);
  logger.fatal(error);
  throw error;
};
