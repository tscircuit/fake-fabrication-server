import { expect, test } from "bun:test"
import { createTestJob, getTestServer } from "tests/fixtures/getTestServer"

test("clamp carrier applies relative delta", async () => {
  const { ky } = await getTestServer()
  const job = await createTestJob(ky)

  const first = await ky.post("carrier/clamp", {
    json: { fabrication_job_id: job.id, delta: 3 },
  })
  expect(first.status).toBe(200)
  const firstBody = await first.json<any>()
  expect(firstBody.carrier.clamp_position).toBe(3)

  const second = await ky.post("carrier/clamp", {
    json: { fabrication_job_id: job.id, delta: -1.25 },
  })
  const secondBody = await second.json<any>()
  expect(secondBody.carrier.clamp_position).toBe(1.75)
})
