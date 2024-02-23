import { Job } from "../scheduler"
import { HostChange } from "../types"

type RedundantTuple = [Job, HostChange]

export function getRedundantJobs(scheduledJobs: Job[], changes: HostChange[]): RedundantTuple[] {
  let jobs: RedundantTuple[] = []

  changes.forEach((change) => {
    // If we have an add change and there's a queued job with a remove change, we can skip it
    if (change.type === "add") {
      const removeJobsForHost = scheduledJobs.find(
        (job) => job.meta?.type === "remove" && job.meta?.hostName === change.host.name
      )

      if (removeJobsForHost !== undefined) {
        jobs.push([removeJobsForHost, change])
      }
    }

    // If we have a remove change and there's a queued add change, we can skip it
    if (change.type === "remove") {
      const addJobsForHost = scheduledJobs.find(
        (job) => job.meta?.type === "add" && job.meta?.hostName === change.host.name
      )

      if (addJobsForHost !== undefined) {
        jobs.push([addJobsForHost, change])
      }
    }
  })

  return jobs
}
