import { expect, test } from "bun:test"
import { createTestJob, getTestServer } from "tests/fixtures/getTestServer"

test("clamp carrier clamps the PCB", async () => {
  const { ky } = await getTestServer()
  const job = await createTestJob(ky)

  const first = await ky.post("carrier/clamp", {
    json: { fabrication_job_id: job.id },
  })
  expect(first.status).toBe(200)
  const firstBody = await first.json<any>()
  expect(firstBody.carrier.clamp_position).toBe(1)
})
