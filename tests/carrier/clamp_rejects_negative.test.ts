import { expect, test } from "bun:test"
import { createTestJob, getTestServer } from "tests/fixtures/getTestServer"

test("clamp carrier rejects negative clamp position", async () => {
  const { ky } = await getTestServer()
  const job = await createTestJob(ky)

  const res = await ky.post("carrier/clamp", {
    json: { fabrication_job_id: job.id, delta: -1 },
  })

  expect(res.status).toBe(409)
})
