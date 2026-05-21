import type { DbClient } from "./db/db-client"
import type { Job } from "./db/schema"
import { apiError } from "./utils"

export function requireJob(db: DbClient, jobId: string): Job | Response {
  const job = db.getJob(jobId)
  if (job == null) {
    return apiError(`No such fabrication.job: '${jobId}'`, 404)
  }
  return job
}

export function updateJob(db: DbClient, job: Job): Job {
  db.setJob(job)
  return job
}
