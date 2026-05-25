import { expect, test } from "bun:test"
import { createTestJob, getTestServer } from "tests/fixtures/getTestServer"

test("rotate carrier normalizes negative deltas", async () => {
  const { ky } = await getTestServer()
  const job = await createTestJob(ky)

  const res = await ky.post("carrier/rotate", {
    json: { fabrication_job_id: job.id, angle_deg: -90 },
  })
  const body = await res.json<any>()
  expect(body.carrier.rotation_deg).toBe(270)
})
