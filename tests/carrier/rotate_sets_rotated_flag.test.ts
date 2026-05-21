import { expect, test } from "bun:test"
import { createTestJob, getTestServer } from "tests/fixtures/getTestServer"

test("rotate sets has_been_rotated", async () => {
  const { ky } = await getTestServer()
  const job = await createTestJob(ky)

  const res = await ky.post("carrier/rotate", {
    json: { fabrication_job_id: job.id, delta_deg: 45 },
  })
  const body = await res.json<any>()
  expect(body.carrier.has_been_rotated).toBe(true)
})
