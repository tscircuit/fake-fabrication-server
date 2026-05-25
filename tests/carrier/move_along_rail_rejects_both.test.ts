import { expect, test } from "bun:test"
import { createTestJob, getTestServer } from "tests/fixtures/getTestServer"

test("move carrier rejects absolute and relative positions together", async () => {
  const { ky } = await getTestServer()
  const job = await createTestJob(ky)

  const res = await ky.post("carrier/move_along_rail", {
    json: { fabrication_job_id: job.id, x: 50, dx: 5 },
  })

  expect(res.status).toBe(400)
})
