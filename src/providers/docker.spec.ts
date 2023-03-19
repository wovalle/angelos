jest.mock("dockerode");

import Docker from "dockerode";
import { mock } from "jest-mock-extended";
import { Logger } from "../lib/logger";
import { getDockerContainersMock } from "../test/fixtures";
import { DockerProvider } from "./docker";

describe("DockerProvider", () => {
  describe("when setup is called", () => {
    describe("and docker could not be contacted", () => {
      it("should throw an error", async () => {
        jest.mocked(Docker.prototype).listContainers.mockImplementationOnce(() => {
          throw new Error("Could not connect to docker");
        });

        const provider = new DockerProvider(mock<Logger>());

        await expect(provider.setup()).rejects.toThrowError();
      });
    });

    describe("and docker could be contacted", () => {
      it("it should not throw", async () => {
        jest.mocked(Docker.prototype).listContainers.mockResolvedValueOnce([]);

        const provider = new DockerProvider(mock<Logger>());

        await provider.setup();
      });
    });
  });

  describe("when subscribe is called", () => {
    it.skip("should subscribe to docker events", async () => {
      // TODO: this test is a PITA to write
    });
  });
  describe("when getHots is called", () => {
    describe("and there are no containers running", () => {
      beforeEach(() => {
        jest.mocked(Docker.prototype).listContainers.mockResolvedValueOnce([]);
      });

      it("should return an empty array", async () => {
        const provider = new DockerProvider(mock<Logger>());

        const hosts = await provider.getHosts();

        expect(hosts).toEqual([]);
      });
    });
    describe("and there are containers running", () => {
      beforeEach(() => {
        const containers = getDockerContainersMock([
          { id: "c1", labels: { "angelos.hostname": "angelos.rocks", "angelos.enabled": "true" } },
          {
            id: "c2",
            labels: { "angelos.hostname": "a.angelos.rocks", "angelos.enabled": "true" },
          },
          {
            id: "c3",
            labels: { "angelos.hostname": "disabled.angelos.rocks", "angelos.enabled": "false" },
          },
        ]);

        jest.mocked(Docker.prototype).listContainers.mockResolvedValueOnce(containers);
      });

      it("should return an array of hosts filtering disabled containers", async () => {
        const provider = new DockerProvider(mock<Logger>());

        const hosts = await provider.getHosts();

        expect(hosts).toEqual([
          { id: "c1", name: "angelos.rocks" },
          { id: "c2", name: "a.angelos.rocks" },
        ]);
      });
    });
  });
});
