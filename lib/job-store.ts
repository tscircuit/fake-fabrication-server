import type { DbClient } from "./db/db-client"
import type { Job } from "./db/schema"
import { apiError } from "./utils"

export function requireJob(db: DbClient, fabricationJobId: string): Job | Response {
  const job = db.getJob(fabricationJobId)
  if (job == null) {
    return apiError(`No such fabrication.job: '${fabricationJobId}'`, 404)
  }
  return job
}

export function updateJob(db: DbClient, job: Job): Job {
  db.setJob(job)
  return job
}
