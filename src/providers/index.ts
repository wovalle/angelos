import { Logger } from "../lib/logger"
import { Provider } from "../types"
import { DockerProvider } from "./docker"
import { TraefikProvider } from "./traefik"

export const getActiveProviders = async (logger: Logger) => {
  const providers: Provider[] = []

  if (process.env.TRAEFIK_API_URL) {
    providers.push(new TraefikProvider(logger.getSubLogger({ name: "TraefikProvider" })))
  }

  if (process.env.DOCKER_API_URL) {
    providers.push(new DockerProvider(logger.getSubLogger({ name: "DockerProvider" })))
  }

  for (const p of providers) {
    await p.setup()
  }

  return providers
}
