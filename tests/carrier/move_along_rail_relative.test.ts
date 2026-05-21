import { expect, test } from "bun:test"
import { createTestJob, getTestServer } from "tests/fixtures/getTestServer"

test("move carrier applies relative x delta", async () => {
  const { ky } = await getTestServer()
  const job = await createTestJob(ky)

  await ky.post("carrier/move_along_rail", {
    json: { fabrication_job_id: job.id, x: 50 },
  })
  const res = await ky.post("carrier/move_along_rail", {
    json: { fabrication_job_id: job.id, dx: -15 },
  })

  expect(res.status).toBe(200)
  const body = await res.json<any>()
  expect(body.carrier.position).toEqual({ x: 35 })
})
