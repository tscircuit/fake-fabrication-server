import { expect, test } from "bun:test"
import { createTestJob, getTestServer } from "tests/fixtures/getTestServer"

test("move sets has_been_positioned", async () => {
  const { ky } = await getTestServer()
  const job = await createTestJob(ky)

  const res = await ky.post("carrier/move_along_rail", {
    json: { fabrication_job_id: job.id, x: 50 },
  })
  const body = await res.json<any>()
  expect(body.carrier.has_been_positioned).toBe(true)
})
