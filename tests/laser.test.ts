import { expect, test } from "bun:test"
import { type LaserResponse } from "../lib/index"
import { createTestJob, getTestServer, testLbrnFiles } from "./utils"

test("alignment turns laser alignment on with an lbrn file", async () => {
  const server = await getTestServer()
  const job = await createTestJob(server)

  const res = await fetch(`${server.url}/v1/laser/alignment`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      job_id: job.id,
      lbrn: "top-alignment.lbrn",
      on: true,
    }),
  })

  expect(res.status).toBe(200)
  const body = (await res.json()) as LaserResponse
  expect(body.ok).toBe(true)
  expect(body.job_id).toBe(job.id)
  expect(body.laser.alignment_on).toBe(true)
  expect(body.laser.alignment_lbrn).toBe("top-alignment.lbrn")
})

test("alignment off clears lbrn", async () => {
  const server = await getTestServer()
  const job = await createTestJob(server)

  await fetch(`${server.url}/v1/laser/alignment`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ job_id: job.id, lbrn: "x.lbrn", on: true }),
  })
  const offRes = await fetch(`${server.url}/v1/laser/alignment`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ job_id: job.id, lbrn: "x.lbrn", on: false }),
  })
  const off = (await offRes.json()) as LaserResponse
  expect(off.laser.alignment_on).toBe(false)
  expect(off.laser.alignment_lbrn).toBeNull()
})

test("move sets laser position", async () => {
  const server = await getTestServer()
  const job = await createTestJob(server)

  const res = await fetch(`${server.url}/v1/laser/move`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ job_id: job.id, dx: 12.5, dy: -3.25 }),
  })

  expect(res.status).toBe(200)
  const body = (await res.json()) as LaserResponse
  expect(body.laser.position).toEqual({ x: 12.5, y: -3.25 })
})

test("burn records the lbrn file", async () => {
  const server = await getTestServer()
  const job = await createTopAlignedJob(
    server.url,
    (await createTestJob(server)).id,
  )

  const res = await fetch(`${server.url}/v1/laser/burn`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      job_id: job.id,
      lbrn: testLbrnFiles.top_deoxidation,
    }),
  })

  expect(res.status).toBe(200)
  const body = (await res.json()) as LaserResponse
  expect(body.laser.last_burn_lbrn).toBe(testLbrnFiles.top_deoxidation)
  expect(body.laser.last_burn_file_content).toContain("LightBurnProject")
})

test("burn rejects before a burn step", async () => {
  const server = await getTestServer()
  const job = await createTestJob(server)

  const res = await fetch(`${server.url}/v1/laser/burn`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      job_id: job.id,
      lbrn: testLbrnFiles.top_deoxidation,
    }),
  })

  expect(res.status).toBe(409)
})

test("burn rejects an lbrn that does not match the current step", async () => {
  const server = await getTestServer()
  const job = await createTopAlignedJob(
    server.url,
    (await createTestJob(server)).id,
  )

  const res = await fetch(`${server.url}/v1/laser/burn`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      job_id: job.id,
      lbrn: testLbrnFiles.top_copper_fill,
    }),
  })

  expect(res.status).toBe(409)
})

test("laser commands 404 for unknown job", async () => {
  const server = await getTestServer()

  const res = await fetch(`${server.url}/v1/laser/move`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ job_id: "job_missing", dx: 0, dy: 0 }),
  })
  expect(res.status).toBe(404)
})

async function createTopAlignedJob(
  serverUrl: string,
  jobId: string,
): Promise<{ id: string }> {
  await postJson(serverUrl, `/v1/jobs/${jobId}/steps/load_pcb/complete`)
  await postJson(serverUrl, "/v1/carrier/clamp", { job_id: jobId, delta: 1 })
  await postJson(serverUrl, `/v1/jobs/${jobId}/steps/clamp_pcb/complete`)
  await postJson(serverUrl, "/v1/carrier/move", { job_id: jobId, x: 1 })
  await postJson(serverUrl, `/v1/jobs/${jobId}/steps/position_carrier/complete`)
  await postJson(serverUrl, "/v1/carrier/rotate", {
    job_id: jobId,
    delta_deg: 1,
  })
  await postJson(serverUrl, `/v1/jobs/${jobId}/steps/level_carrier/complete`)
  await postJson(serverUrl, "/v1/laser/alignment", {
    job_id: jobId,
    lbrn: testLbrnFiles.top_alignment,
    on: true,
  })
  await postJson(serverUrl, "/v1/laser/move", { job_id: jobId, dx: 1, dy: 1 })
  await postJson(serverUrl, "/v1/laser/alignment", {
    job_id: jobId,
    lbrn: testLbrnFiles.top_alignment,
    on: false,
  })
  await postJson(serverUrl, `/v1/jobs/${jobId}/steps/top_alignment/complete`)
  return { id: jobId }
}

async function postJson(
  serverUrl: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<void> {
  let requestBody = "{}"
  if (body != null) {
    requestBody = JSON.stringify(body)
  }

  const res = await fetch(`${serverUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: requestBody,
  })
  expect(res.status).toBe(200)
}
