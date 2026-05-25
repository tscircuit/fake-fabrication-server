import { expect, test } from "bun:test"
import { createTestJob, getTestServer } from "tests/fixtures/getTestServer"

test("rotate_to_orientation sets orientation", async () => {
  const { ky } = await getTestServer()
  const job = await createTestJob(ky)

  const res = await ky.post("carrier/rotate_to_orientation", {
    json: { fabrication_job_id: job.id, orientation: "bottom" },
  })
  const body = await res.json<any>()
  expect(body.carrier.orientation).toBe("bottom")
})
