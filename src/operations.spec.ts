import { makeOperations } from "./operations";

import { mock } from "jest-mock-extended";
import { Logger } from "./lib/logger";
import { Scheduler } from "./scheduler";
import { Provider, Target } from "./types";

describe("operations", () => {
  const mockLogger = mock<Logger>();
  const scheduler = mock<Scheduler>();
  const provider = mock<Provider>();
  const target = mock<Target>();

  let operations: ReturnType<typeof makeOperations>;

  beforeEach(() => {
    operations = makeOperations({
      logger: mockLogger,
      scheduler,
      providers: [provider],
      targets: [target],
    });
  });

  describe("syncResources", () => {
    describe("when provider has records that target does not", () => {
      it("should add records to target", async () => {
        jest.mocked(provider).getHosts.mockResolvedValue([{ id: "foo", name: "foo.rocks" }]);
        jest.mocked(target).getHosts.mockResolvedValue([]);

        await operations.syncResources();

        expect(target.apply).toBeCalledWith([
          {
            type: "add",
            host: {
              id: "foo",
              name: "foo.rocks",
            },
          },
        ]);
      });
    });

    describe("when target has records that provider does not", () => {
      it("should remove records from target", async () => {
        jest.mocked(provider).getHosts.mockResolvedValue([]);
        jest.mocked(target).getHosts.mockResolvedValue([{ id: "foo", name: "foo.rocks" }]);

        await operations.syncResources();

        expect(target.apply).toBeCalledWith([
          {
            type: "remove",
            host: {
              id: "foo",
              name: "foo.rocks",
            },
          },
        ]);
      });
    });

    describe("when provider and target have records that are different", () => {
      it("should update records in target", async () => {
        jest.mocked(provider).getHosts.mockResolvedValue([{ id: "foo", name: "foo.rocks" }]);
        jest.mocked(target).getHosts.mockResolvedValue([{ id: "bar", name: "bar.rocks" }]);

        await operations.syncResources();

        expect(target.apply).toBeCalledWith([
          {
            type: "add",
            host: {
              id: "foo",
              name: "foo.rocks",
            },
          },
          {
            type: "remove",
            host: {
              id: "bar",
              name: "bar.rocks",
            },
          },
        ]);
      });
    });

    describe("when provider and target have records that are the same", () => {
      it("should do nothing", async () => {
        jest.mocked(provider).getHosts.mockResolvedValue([{ id: "foo", name: "foo.rocks" }]);
        jest.mocked(target).getHosts.mockResolvedValue([{ id: "foo", name: "foo.rocks" }]);

        await operations.syncResources();

        expect(target.apply).not.toBeCalled();
      });
    });
  });
});
