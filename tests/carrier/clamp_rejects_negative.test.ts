import { expect, test } from "bun:test"
import { createTestJob, getTestServer } from "tests/fixtures/getTestServer"

test("release carrier unclamps the PCB", async () => {
  const { ky } = await getTestServer()
  const job = await createTestJob(ky)

  await ky.post("carrier/clamp", {
    json: { fabrication_job_id: job.id },
  })
  const res = await ky.post("carrier/release", {
    json: { fabrication_job_id: job.id },
  })

  expect(res.status).toBe(200)
  const body = await res.json<any>()
  expect(body.carrier.clamp_position).toBe(0)
})
