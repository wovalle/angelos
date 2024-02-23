import { makeOperations } from "./operations"

import { mock } from "jest-mock-extended"
import { Logger } from "./lib/logger"
import { Job, Scheduler } from "./scheduler"
import { Provider, Target } from "./types"

describe("operations", () => {
  const logger = mock<Logger>()
  const scheduler = mock<Scheduler>({ getJobs: jest.fn(() => []) })
  const provider = mock<Provider>()
  const target = mock<Target>({ getName: jest.fn(() => "foo") })

  let operations: ReturnType<typeof makeOperations>

  beforeEach(() => {
    operations = makeOperations({
      logger: logger,
      scheduler,
      providers: [provider],
      targets: [target],
      addTargetRecordDelay: 0,
      removeTargetRecordDelay: 0,
    })
  })

  describe("syncResources", () => {
    beforeAll(() => {
      jest.useFakeTimers({
        now: new Date("2020-01-01T00:00:00.000Z"),
      })
    })

    afterAll(() => {
      jest.useRealTimers()
    })

    describe("when provider has records that target does not", () => {
      it("should add records to target", async () => {
        jest.mocked(provider).getHosts.mockResolvedValue([{ id: "foo", name: "foo.rocks" }])
        jest.mocked(target).getHosts.mockResolvedValue([])

        await operations.syncResources()

        expect(logger.info).toBeCalledWith("About to schedule 1 changes to foo:")
        expect(logger.info).toBeCalledWith(" - add foo.rocks")

        expect(scheduler.scheduleJob).toBeCalledWith({
          delayInSeconds: 0,
          fn: expect.any(Function),
          jobId: "2020-01-01T00:00:00.000Z::foo::add::foo.rocks",
          meta: {
            hostName: "foo.rocks",
            type: "add",
          },
          type: "ApplyChanges",
        })

        // Call the inner function that is passed to scheduler.scheduleJob
        await scheduler.scheduleJob.mock.lastCall?.[0].fn()

        expect(target.apply).toBeCalledWith([
          {
            type: "add",
            host: {
              id: "foo",
              name: "foo.rocks",
            },
          },
        ])
      })
    })

    describe("when target has records that provider does not", () => {
      it("should remove records from target", async () => {
        jest.mocked(provider).getHosts.mockResolvedValue([])
        jest.mocked(target).getHosts.mockResolvedValue([{ id: "foo", name: "foo.rocks" }])

        await operations.syncResources()

        expect(scheduler.scheduleJob).toBeCalledWith({
          delayInSeconds: 0,
          fn: expect.any(Function),
          jobId: "2020-01-01T00:00:00.000Z::foo::remove::foo.rocks",
          meta: {
            hostName: "foo.rocks",
            type: "remove",
          },
          type: "ApplyChanges",
        })

        // Call the inner function that is passed to scheduler.scheduleJob
        await scheduler.scheduleJob.mock.lastCall?.[0].fn()

        expect(target.apply).toBeCalledWith([
          {
            type: "remove",
            host: {
              id: "foo",
              name: "foo.rocks",
            },
          },
        ])
      })
    })

    describe("when provider and target have records that are different", () => {
      it("should update records in target", async () => {
        jest.mocked(provider).getHosts.mockResolvedValue([{ id: "foo", name: "foo.rocks" }])
        jest.mocked(target).getHosts.mockResolvedValue([{ id: "bar", name: "bar.rocks" }])

        await operations.syncResources()

        // Call the inner functions that are passed to scheduler.scheduleJob
        scheduler.scheduleJob.mock.calls.forEach(async (call) => {
          await call[0].fn()
        })

        expect(target.apply).toHaveBeenNthCalledWith(1, [
          {
            type: "add",
            host: {
              id: "foo",
              name: "foo.rocks",
            },
          },
        ])

        expect(target.apply).toHaveBeenNthCalledWith(2, [
          {
            type: "remove",
            host: {
              id: "bar",
              name: "bar.rocks",
            },
          },
        ])
      })
    })

    describe("when provider and target have records that are the same", () => {
      it("should do nothing", async () => {
        jest.mocked(provider).getHosts.mockResolvedValue([{ id: "foo", name: "foo.rocks" }])
        jest.mocked(target).getHosts.mockResolvedValue([{ id: "foo", name: "foo.rocks" }])

        await operations.syncResources()

        expect(scheduler.scheduleJob).not.toBeCalled()
        expect(target.apply).not.toBeCalled()
      })
    })

    describe("when provider and target have redundant records", () => {
      it("should only apply not redundant changes", async () => {
        const job = mock<Job>({
          jobId: "foo",
          meta: {
            hostName: "foo.rocks",
            type: "add",
          },
        })

        jest.mocked(scheduler).getJobs.mockReturnValue([job])
        jest.mocked(provider).getHosts.mockResolvedValue([
          { id: "bar", name: "bar.rocks" },
          { id: "baz", name: "baz.rocks" },
        ])
        jest.mocked(target).getHosts.mockResolvedValue([
          { id: "foo", name: "foo.rocks" },
          { id: "bar", name: "bar.rocks" },
        ])

        await operations.syncResources()

        expect(scheduler.removeJobIfExists).toBeCalledWith(job)
        expect(scheduler.scheduleJob).toHaveBeenCalledTimes(1)
        expect(scheduler.scheduleJob).toBeCalledWith({
          delayInSeconds: 0,
          fn: expect.any(Function),
          jobId: "2020-01-01T00:00:00.000Z::foo::add::baz.rocks",
          meta: { hostName: "baz.rocks", type: "add" },
          type: "ApplyChanges",
        })
      })
    })
  })
})
