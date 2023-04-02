import { mock } from "jest-mock-extended"
import { Job } from "../scheduler"
import { HostChange } from "../types"
import { getRedundantJobs } from "./getRedundantJobs"

describe("getRedundantJobs", () => {
  describe("when there are no redundant jobs", () => {
    it("should return the an empty array", () => {
      const operation1 = mock<HostChange>({
        type: "add",
        host: {
          name: "foo.rocks",
        },
      })

      const job1 = mock<Job>({
        meta: {
          type: "remove",
          hostName: "bar.rocks",
        },
      })

      const expectedOperations = [operation1]

      expect(getRedundantJobs([job1], [operation1])).toEqual([])
    })
  })

  describe("when we have an add operation and there is a remove job queued for the same host", () => {
    it("should return the remove job", () => {
      const operation1 = mock<HostChange>({
        type: "add",
        host: {
          name: "foo.rocks",
        },
      })

      const job1 = mock<Job>({
        meta: {
          type: "remove",
          hostName: "foo.rocks",
        },
      })

      const expectedOperations = [job1, operation1]

      expect(getRedundantJobs([job1], [operation1])).toEqual([expectedOperations])
    })
  })

  describe("when we have a remove operation and there is an queued add job for the same host", () => {
    it("should remove the remove operation", () => {
      const operation1 = mock<HostChange>({
        type: "remove",
        host: {
          name: "foo.rocks",
        },
      })

      const job1 = mock<Job>({
        meta: {
          type: "add",
          hostName: "foo.rocks",
        },
      })

      const expectedOperations = [job1, operation1]

      expect(getRedundantJobs([job1], [operation1])).toEqual([expectedOperations])
    })
  })
})
