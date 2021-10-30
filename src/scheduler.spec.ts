import { makeScheduler } from "./scheduler";
import { getMockLogger } from "../test/testUtils";

describe("Scheduler", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("should schedule jobs", async () => {
    const scheduler = makeScheduler(getMockLogger(), 100);

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
