import { expect, test } from "bun:test"
import { createTestJob, getTestServer } from "tests/fixtures/getTestServer"

test("move carrier rejects y position", async () => {
  const { ky } = await getTestServer()
  const job = await createTestJob(ky)

  const res = await ky.post("carrier/move_along_rail", {
    json: { fabrication_job_id: job.id, x: 50, y: 75 },
  })

  expect(res.status).toBe(400)
})
