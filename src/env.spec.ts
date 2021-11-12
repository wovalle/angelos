import * as env from "./env";

const defaultEnv = {
  CLOUDFLARE_ZONE_ID: "CLOUDFLARE_ZONE_ID",
  CLOUDFLARE_TUNNEL_URL: "uuid.cfargotunnel.com",
  CLOUDFLARE_API_TOKEN: "CLOUDFLARE_API_TOKEN",
  TRAEFIK_API_URL: "TRAEFIK_API_URL",
};

const validProviders = Object.values(env.Provider);

describe("env", () => {
  let requiredEnvVars: Record<string, string> = {};
  beforeEach(() => {
    process.env = {};
    requiredEnvVars = Object.assign({}, defaultEnv);
  });

  describe("getEnvVars", () => {
    describe("required env vars", () => {
      const required = Object.keys(defaultEnv).filter((e) => e !== "TRAEFIK_API_URL");

      describe.each(required)("%s", (envVar) => {
        it(`should throw an error if ${envVar} is not set`, () => {
          delete requiredEnvVars[envVar];
          process.env = { ...requiredEnvVars };

          expect(() => env.getEnvVars()).toThrow(`Environment Variable ${envVar} was not found`);
        });
      });

      it("should throw if provider=traefik and no url is passed", () => {
        process.env = { ...requiredEnvVars, TRAEFIK_API_URL: undefined, PROVIDER: "traefik" };
        expect(() => env.getEnvVars()).toThrowError(
          "TRAEFIK_API_URL is required when PROVIDER=traefik"
        );
      });
    });

    describe("provider", () => {
      it("should throw invalid provider", () => {
        process.env = { ...requiredEnvVars, PROVIDER: "invalid" };
        expect(() => env.getEnvVars()).toThrowError(
          "Invalid PROVIDER=invalid. Must be one of: docker, traefik"
        );
      });

      describe.each(validProviders)("%s", (provider) => {
        it("should return valid provider", () => {
          process.env = { ...requiredEnvVars, PROVIDER: provider };
          expect(env.getEnvVars()).toEqual(expect.objectContaining({ provider }));
        });
      });
    });
  });
});
