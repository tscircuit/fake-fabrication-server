import { expect, test } from "bun:test"
import { createTestJob, getTestServer } from "tests/fixtures/getTestServer"

test("move carrier applies absolute x position", async () => {
  const { ky } = await getTestServer()
  const job = await createTestJob(ky)

  const first = await ky.post("carrier/move_along_rail", {
    json: { fabrication_job_id: job.id, x: 50 },
  })
  expect(first.status).toBe(200)
  const firstBody = await first.json<any>()
  expect(firstBody.carrier.position).toEqual({ x: 50 })

  const second = await ky.post("carrier/move_along_rail", {
    json: { fabrication_job_id: job.id, x: -20 },
  })
  const secondBody = await second.json<any>()
  expect(secondBody.carrier.position).toEqual({ x: -20 })
})
