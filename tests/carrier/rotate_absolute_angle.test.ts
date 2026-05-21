import { expect, test } from "bun:test"
import { createTestJob, getTestServer } from "tests/fixtures/getTestServer"

test("rotate carrier can set an absolute angle", async () => {
  const { ky } = await getTestServer()
  const job = await createTestJob(ky)

  await ky.post("carrier/rotate", {
    json: { fabrication_job_id: job.id, delta_deg: 180 },
  })
  const res = await ky.post("carrier/rotate", {
    json: { fabrication_job_id: job.id, angle_deg: 45 },
  })

  const body = await res.json<any>()
  expect(body.carrier.rotation_deg).toBe(45)
})
