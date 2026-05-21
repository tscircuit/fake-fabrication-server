import { type CarrierResponse } from "../lib/index"
import { expect, test } from "bun:test"
import { createTestJob, getTestServer } from "./utils"

test("job is created with carrier at origin and zero rotation", async () => {
  const server = await getTestServer()
  const job = await createTestJob(server)
  expect(job.carrier.position).toEqual({ x: 0 })
  expect(job.carrier.rotation_deg).toBe(0)
  expect(job.carrier.clamp_position).toBe(0)
  expect(job.carrier.has_been_positioned).toBe(false)
  expect(job.carrier.has_been_rotated).toBe(false)
})

test("clamp carrier applies relative delta", async () => {
  const server = await getTestServer()
  const job = await createTestJob(server)

  const first = await fetch(`${server.url}/v1/carrier/clamp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ job_id: job.id, delta: 3 }),
  })
  expect(first.status).toBe(200)
  const firstBody = (await first.json()) as CarrierResponse
  expect(firstBody.carrier.clamp_position).toBe(3)

  const second = await fetch(`${server.url}/v1/carrier/clamp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ job_id: job.id, delta: -1.25 }),
  })
  const secondBody = (await second.json()) as CarrierResponse
  expect(secondBody.carrier.clamp_position).toBe(1.75)
})

test("clamp carrier rejects negative clamp position", async () => {
  const server = await getTestServer()
  const job = await createTestJob(server)

  const res = await fetch(`${server.url}/v1/carrier/clamp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ job_id: job.id, delta: -1 }),
  })

  expect(res.status).toBe(409)
})

test("move carrier applies absolute x position", async () => {
  const server = await getTestServer()
  const job = await createTestJob(server)

  const first = await fetch(`${server.url}/v1/carrier/move`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ job_id: job.id, x: 50 }),
  })
  expect(first.status).toBe(200)
  const firstBody = (await first.json()) as CarrierResponse
  expect(firstBody.carrier.position).toEqual({ x: 50 })

  const second = await fetch(`${server.url}/v1/carrier/move`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ job_id: job.id, x: -20 }),
  })
  const secondBody = (await second.json()) as CarrierResponse
  expect(secondBody.carrier.position).toEqual({ x: -20 })
})

test("move carrier applies relative x delta", async () => {
  const server = await getTestServer()
  const job = await createTestJob(server)

  await fetch(`${server.url}/v1/carrier/move`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ job_id: job.id, x: 50 }),
  })
  const res = await fetch(`${server.url}/v1/carrier/move`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ job_id: job.id, dx: -15 }),
  })

  expect(res.status).toBe(200)
  const body = (await res.json()) as CarrierResponse
  expect(body.carrier.position).toEqual({ x: 35 })
})

test("move carrier rejects y position", async () => {
  const server = await getTestServer()
  const job = await createTestJob(server)

  const res = await fetch(`${server.url}/v1/carrier/move`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ job_id: job.id, x: 50, y: 75 }),
  })

  expect(res.status).toBe(400)
})

test("move carrier rejects absolute and relative positions together", async () => {
  const server = await getTestServer()
  const job = await createTestJob(server)

  const res = await fetch(`${server.url}/v1/carrier/move`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ job_id: job.id, x: 50, dx: 5 }),
  })

  expect(res.status).toBe(400)
})

test("rotate carrier accumulates delta and normalizes to [0,360)", async () => {
  const server = await getTestServer()
  const job = await createTestJob(server)

  await fetch(`${server.url}/v1/carrier/rotate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ job_id: job.id, delta_deg: 270 }),
  })
  const res = await fetch(`${server.url}/v1/carrier/rotate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ job_id: job.id, delta_deg: 180 }),
  })

  const body = (await res.json()) as CarrierResponse
  expect(body.carrier.rotation_deg).toBe(90)
})

test("rotate carrier normalizes negative deltas", async () => {
  const server = await getTestServer()
  const job = await createTestJob(server)

  const res = await fetch(`${server.url}/v1/carrier/rotate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ job_id: job.id, delta_deg: -90 }),
  })
  const body = (await res.json()) as CarrierResponse
  expect(body.carrier.rotation_deg).toBe(270)
})

test("rotate carrier can set an absolute angle", async () => {
  const server = await getTestServer()
  const job = await createTestJob(server)

  await fetch(`${server.url}/v1/carrier/rotate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ job_id: job.id, delta_deg: 180 }),
  })
  const res = await fetch(`${server.url}/v1/carrier/rotate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ job_id: job.id, angle_deg: 45 }),
  })

  const body = (await res.json()) as CarrierResponse
  expect(body.carrier.rotation_deg).toBe(45)
})

test("move sets has_been_positioned", async () => {
  const server = await getTestServer()
  const job = await createTestJob(server)

  const res = await fetch(`${server.url}/v1/carrier/move`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ job_id: job.id, x: 50 }),
  })
  const body = (await res.json()) as CarrierResponse
  expect(body.carrier.has_been_positioned).toBe(true)
})

test("rotate sets has_been_rotated", async () => {
  const server = await getTestServer()
  const job = await createTestJob(server)

  const res = await fetch(`${server.url}/v1/carrier/rotate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ job_id: job.id, delta_deg: 45 }),
  })
  const body = (await res.json()) as CarrierResponse
  expect(body.carrier.has_been_rotated).toBe(true)
})

test("carrier commands 404 for unknown job", async () => {
  const server = await getTestServer()

  const res = await fetch(`${server.url}/v1/carrier/move`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ job_id: "job_missing", x: 0 }),
  })
  expect(res.status).toBe(404)
})
