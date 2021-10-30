import { createMock } from "ts-jest-mock";
import { makeScheduler } from "./scheduler";
import { Logger } from "tslog";

describe("Scheduler", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("should schedule jobs", async () => {
    const MockLogger = createMock(Logger);
    const scheduler = makeScheduler(new MockLogger(), 100);

    const fn = jest.fn();

    scheduler.scheduleJob({ type: "AddDnsRecord", jobId: "test", fn });
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
});
