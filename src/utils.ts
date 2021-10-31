import axios, { AxiosRequestConfig } from "axios";
import { nanoid } from "nanoid";
import type { Logger } from "tslog";

export const throwFatal = (logger: Logger, e: unknown, errorText?: string) => {
  if (axios.isAxiosError(e)) {
    logger.fatal("[Axios Error]", e.response?.data);
  } else {
    logger.fatal(e);
  }

  if (errorText) {
    const error = new Error(errorText);
    logger.fatal(error);
  }

  throw e;
};

export const logError = (logger: Logger, e: unknown) => {
  if (axios.isAxiosError(e)) {
    logger.error(e.response?.data);
  } else {
    logger.error(e);
  }
};

export const getAxiosInstance = (logger: Logger, config?: AxiosRequestConfig<any> | undefined) => {
  const instance = axios.create(config);

  instance.interceptors.request.use((config) => {
    const requestId = nanoid();

    logger.silly(
      "[Axios Request]",
      requestId,
      config.method,
      config.baseURL,
      config.url,
      config.data
    );

    return { ...config, requestId };
  });

  instance.interceptors.response.use((response) => {
    logger.silly(
      "[Axios Response]",
      (response.config as any).requestId,
      response.status,
      response.config.method,
      response.config.baseURL,
      response.config.url,
      response.config.data,
      response.data
    );
    return response;
  });

  return instance;
};
