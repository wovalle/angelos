import { mock } from "jest-mock-extended"
import { DefaultBodyType, rest } from "msw"
import { SetupServer } from "msw/node"
import { Logger } from "../lib/logger"
import { EndpointTuple } from "../types"

export const addMswHandlerOnce = (
  server: SetupServer,
  [method, url]: EndpointTuple,
  payload: DefaultBodyType
) => {
  server.use(
    rest[method](url, (req, res, ctx) => {
      return res.once(ctx.json(payload))
    })
  )
}

export const getLoggerMock = () => {
  const logger = mock<Logger>()
  logger.getSubLogger.mockReturnValue(logger)

  return logger
}
