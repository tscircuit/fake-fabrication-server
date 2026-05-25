import { expect, test } from "bun:test"
import { getTestServer } from "tests/fixtures/getTestServer"

test("carrier commands 404 for unknown job", async () => {
  const { ky } = await getTestServer()

  const res = await ky.post("carrier/move_along_rail", {
    json: { fabrication_job_id: "job_missing", x: 0 },
  })
  expect(res.status).toBe(404)
})
