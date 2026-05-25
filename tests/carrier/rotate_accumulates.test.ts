import { expect, test } from "bun:test"
import { createTestJob, getTestServer } from "tests/fixtures/getTestServer"

test("rotate carrier sets absolute angle and normalizes to [0,360)", async () => {
  const { ky } = await getTestServer()
  const job = await createTestJob(ky)

  await ky.post("carrier/rotate", {
    json: { fabrication_job_id: job.id, angle_deg: 270 },
  })
  const res = await ky.post("carrier/rotate", {
    json: { fabrication_job_id: job.id, angle_deg: 180 },
  })

  const body = await res.json<any>()
  expect(body.carrier.rotation_deg).toBe(180)
})
