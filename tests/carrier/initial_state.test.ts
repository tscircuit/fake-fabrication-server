import { expect, test } from "bun:test"
import { createTestJob, getTestServer } from "tests/fixtures/getTestServer"

test("job is created with carrier at origin and zero rotation", async () => {
  const { ky } = await getTestServer()
  const job = await createTestJob(ky)
  expect(job.carrier.position).toEqual({ x: 0 })
  expect(job.carrier.rotation_deg).toBe(0)
  expect(job.carrier.clamp_position).toBe(0)
  expect(job.carrier.has_been_positioned).toBe(false)
  expect(job.carrier.has_been_rotated).toBe(false)
})
