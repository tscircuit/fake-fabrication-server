import { test } from "node:test"
import assert from "node:assert/strict"
import type { Job } from "../../lib/db/schema"
import type { AppContext } from "../../lib/types"
import { listJobs } from "../../lib/jobs"

function makeJob(id: string, created: number): Job {
  return {
    id,
    object: "fabrication.job",
    created,
    status: "pending",
    current_stage: null,
    stages: [],
    laser: {
      alignment_origin: null,
      position: { x: 0, y: 0 },
      last_burn_lbrn: null,
      last_burn_passes: null,
      last_burn_origin: null,
      last_burn_file_content: null,
      last_command_at: null,
    },
    carrier: {
      position: { x: 0 },
      has_been_moved: false,
      rotation_deg: 0,
      orientation: null,
      clamp_position: 0,
      last_command_at: null,
    },
    lbrn_files: { "/board.lbrn": id },
    top_alignment_origin: null,
    bottom_alignment_origin: null,
    metadata: { label: id },
  }
}

// A unit-contract fixture at the existing DbClient boundary, not a database.
function contextFor(jobs: Job[]): AppContext {
  return { db: { listJobs: () => jobs } as AppContext["db"] }
}

const cases: Array<[string, { limit?: number }, string[]]> = [
  ["omitted limit", {}, ["job_b", "job_a", "job_c"]],
  ["undefined limit", { limit: undefined }, ["job_b", "job_a", "job_c"]],
  ["limit one", { limit: 1 }, ["job_b"]],
  ["limit below length", { limit: 2 }, ["job_b", "job_a"]],
  ["limit equal to length", { limit: 3 }, ["job_b", "job_a", "job_c"]],
  ["limit above length", { limit: 10 }, ["job_b", "job_a", "job_c"]],
]

for (const [name, params, expectedIds] of cases) {
  test(`listJobs preserves stored order and fields with ${name}`, () => {
    const jobs = [makeJob("job_b", 20), makeJob("job_a", 30), makeJob("job_c", 10)]
    const before = structuredClone(jobs)
    const ctx = contextFor(jobs)
    const result = listJobs(params, ctx)

    if (params.limit === undefined) assert.equal(result, jobs)
    assert.deepEqual(result.map((job) => job.id), expectedIds)
    for (const [index, job] of result.entries()) {
      assert.deepEqual(job, before[index])
    }
    assert.deepEqual(jobs, before)
    assert.deepEqual(listJobs({}, ctx), before)
  })
}

test("listJobs returns no jobs from an empty store", () => {
  const jobs: Job[] = []
  const ctx = contextFor(jobs)
  assert.deepEqual(listJobs({ limit: 1 }, ctx), [])
  assert.deepEqual(listJobs({}, ctx), [])
  assert.deepEqual(jobs, [])
})
