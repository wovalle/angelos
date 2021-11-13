import { makeScheduler, Scheduler } from "./scheduler";
import { mock } from "jest-mock-extended";
import { Logger } from "tslog";

describe("Scheduler", () => {
  let scheduler: Scheduler;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    scheduler = makeScheduler(mock<Logger>());
  });
  it("should schedule jobs", async () => {
    const fn = jest.fn();

    scheduler.scheduleJob({ type: "AddDnsRecord", jobId: "test", fn, delayInSeconds: 100 });
    expect(fn).not.toHaveBeenCalled();

    expect(scheduler.getJobs().get("test")).toEqual(
      expect.objectContaining({
        type: "AddDnsRecord",
        jobId: "test",
      })
    );

    jest.advanceTimersByTime(99 * 1000);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1 * 1001);
    expect(fn).toHaveBeenCalled();
  });

  it("should schedule interval jobs", async () => {
    const fn = jest.fn();

    scheduler.scheduleIntervalJob({
      type: "AddDnsRecord",
      jobId: "interval test",
      fn,
      intervalTimeInSeconds: 100,
    });

    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100 * 1000);
    expect(fn).toHaveBeenCalled();

    jest.advanceTimersByTime(100 * 1000);
    jest.advanceTimersByTime(100 * 1000);
    jest.advanceTimersByTime(100 * 1000);
    jest.advanceTimersByTime(100 * 1000);
    expect(fn).toHaveBeenCalledTimes(5);
  });

  it("should remove jobs if removeJobIfExists was called", async () => {
    scheduler.scheduleJob({
      type: "AddDnsRecord",
      jobId: "test",
      fn: jest.fn(),
      delayInSeconds: 100,
    });

    scheduler.scheduleJob({
      type: "AddDnsRecord",
      jobId: "test2",
      fn: jest.fn(),
      delayInSeconds: 100,
    });

    expect(scheduler.getJobs().size).toEqual(2);

    scheduler.removeJobIfExists({
      type: "RemoveDnsRecord",
      jobId: "test",
    });

    scheduler.removeJobIfExists({
      type: "AddDnsRecord",
      jobId: "test2",
    });

    expect(scheduler.getJobs().size).toEqual(1);
  });
});
