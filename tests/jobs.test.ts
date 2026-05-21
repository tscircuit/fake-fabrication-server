import { expect, test } from "bun:test"
import {
  fabricationStepOrder,
  type FabricationStepSlug,
  type Job,
} from "../lib/index"
import { createTestJob, getTestServer, testLbrnFiles } from "./utils"

test("creates a fabrication job with all steps pending except first", async () => {
  const server = await getTestServer()

  const response = await fetch(`${server.url}/v1/jobs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      metadata: { order_id: "order_1" },
      lbrn_files: testLbrnFiles,
    }),
  })

  expect(response.status).toBe(200)

  const job = (await response.json()) as Job
  expect(job.id).toBe("job_1")
  expect(job.object).toBe("fabrication.job")
  expect(job.status).toBe("in_progress")
  expect(job.current_step).toBe("load_pcb")
  expect(job.steps).toHaveLength(13)
  expect(job.steps[0]!.status).toBe("in_progress")
  expect(job.steps[1]!.status).toBe("pending")
  expect(job.steps[1]!.slug).toBe("clamp_pcb")
  expect(job.metadata.order_id).toBe("order_1")
  expect(job.laser.alignment_on).toBe(false)
  expect(job.laser.position).toEqual({ x: 0, y: 0 })
  expect(job.top_alignment_offset).toBeNull()
  expect(job.bottom_alignment_offset).toBeNull()
  expect(job.carrier.clamp_position).toBe(0)
})

test("rejects creating a job without lbrn files", async () => {
  const server = await getTestServer()

  const res = await fetch(`${server.url}/v1/jobs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  })

  expect(res.status).toBe(400)
})

test("retrieves a job", async () => {
  const server = await getTestServer()
  const created = await createTestJob(server)

  const getRes = await fetch(`${server.url}/v1/jobs/${created.id}`)
  expect(getRes.status).toBe(200)
  const retrieved = (await getRes.json()) as Job
  expect(retrieved.id).toBe(created.id)
})

test("404s for missing job", async () => {
  const server = await getTestServer()

  const res = await fetch(`${server.url}/v1/jobs/job_missing`)
  expect(res.status).toBe(404)
  const body = (await res.json()) as {
    error: { type: string; message: string }
  }
  expect(body.error.type).toBe("invalid_request_error")
  expect(body.error.message).toContain("No such fabrication.job")
})

test("completes steps in order and advances current_step", async () => {
  const server = await getTestServer()
  const created = await createTestJob(server)

  let job = created
  for (const slug of fabricationStepOrder) {
    expect(job.current_step).toBe(slug)
    await satisfyStepPrecondition(server.url, created.id, slug)
    const completeRes = await fetch(
      `${server.url}/v1/jobs/${created.id}/steps/${slug}/complete`,
      { method: "POST" },
    )
    expect(completeRes.status).toBe(200)
    job = (await completeRes.json()) as Job
  }

  expect(job.status).toBe("complete")
  expect(job.current_step).toBeNull()
  for (const step of job.steps) {
    expect(step.status).toBe("complete")
    expect(step.completed_at).not.toBeNull()
  }
})

test("rejects completing an out-of-order step", async () => {
  const server = await getTestServer()
  const created = await createTestJob(server)

  const res = await fetch(
    `${server.url}/v1/jobs/${created.id}/steps/top_copper_fill/complete`,
    { method: "POST" },
  )
  expect(res.status).toBe(409)
})

test("rejects unknown step slug", async () => {
  const server = await getTestServer()
  const created = await createTestJob(server)

  const res = await fetch(
    `${server.url}/v1/jobs/${created.id}/steps/not_a_step/complete`,
    { method: "POST" },
  )
  expect(res.status).toBe(400)
})

async function satisfyStepPrecondition(
  serverUrl: string,
  jobId: string,
  slug: FabricationStepSlug,
): Promise<void> {
  if (slug === "clamp_pcb") {
    await postJson(serverUrl, "/v1/carrier/clamp", {
      job_id: jobId,
      delta: 1,
    })
  }
  if (slug === "position_carrier") {
    await postJson(serverUrl, "/v1/carrier/move", {
      job_id: jobId,
      x: 1,
    })
  }
  if (slug === "level_carrier" || slug === "flip_board") {
    await postJson(serverUrl, "/v1/carrier/rotate", {
      job_id: jobId,
      delta_deg: 180,
    })
  }
  if (slug === "top_alignment") {
    await completeAlignment(serverUrl, jobId, testLbrnFiles.top_alignment)
  }
  if (slug === "bottom_alignment") {
    await completeAlignment(serverUrl, jobId, testLbrnFiles.bottom_alignment)
  }
  if (slug === "top_deoxidation") {
    await postJson(serverUrl, "/v1/laser/burn", {
      job_id: jobId,
      lbrn: testLbrnFiles.top_deoxidation,
    })
  }
  if (slug === "top_copper_fill") {
    await postJson(serverUrl, "/v1/laser/burn", {
      job_id: jobId,
      lbrn: testLbrnFiles.top_copper_fill,
    })
  }
  if (slug === "bottom_deoxidation") {
    await postJson(serverUrl, "/v1/laser/burn", {
      job_id: jobId,
      lbrn: testLbrnFiles.bottom_deoxidation,
    })
  }
  if (slug === "bottom_copper_fill") {
    await postJson(serverUrl, "/v1/laser/burn", {
      job_id: jobId,
      lbrn: testLbrnFiles.bottom_copper_fill,
    })
  }
  if (slug === "release_pcb") {
    await postJson(serverUrl, "/v1/carrier/move", {
      job_id: jobId,
      x: 10,
    })
    await postJson(serverUrl, "/v1/carrier/rotate", {
      job_id: jobId,
      angle_deg: 45,
    })
    await postJson(serverUrl, "/v1/carrier/clamp", {
      job_id: jobId,
      delta: -1,
    })
  }
}

async function completeAlignment(
  serverUrl: string,
  jobId: string,
  lbrn: string,
): Promise<void> {
  await postJson(serverUrl, "/v1/laser/alignment", {
    job_id: jobId,
    lbrn,
    on: true,
  })
  await postJson(serverUrl, "/v1/laser/move", {
    job_id: jobId,
    dx: 1,
    dy: 1,
  })
  await postJson(serverUrl, "/v1/laser/alignment", {
    job_id: jobId,
    lbrn,
    on: false,
  })
}

async function postJson(
  serverUrl: string,
  path: string,
  body: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(`${serverUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  expect(res.status).toBe(200)
}
