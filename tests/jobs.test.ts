import { expect, test } from "bun:test"
import {
  fabricationStepOrder,
  createTestJob,
  getTestServer,
  testLbrnFiles,
} from "tests/fixtures/getTestServer"

test("creates a fabrication job with all steps pending except first", async () => {
  const { ky } = await getTestServer()

  const response = await ky.post("fabrication_jobs/create", {
    json: {
      metadata: { order_id: "order_1" },
      lbrn_files: testLbrnFiles,
    },
  })

  expect(response.status).toBe(200)

  const job = await response.json<any>()
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
  const { ky } = await getTestServer()

  const res = await ky.post("fabrication_jobs/create")

  expect(res.status).toBe(400)
})

test("retrieves a job", async () => {
  const { ky } = await getTestServer()
  const created = await createTestJob(ky)

  const getRes = await ky.get("fabrication_jobs/get", {
    searchParams: { fabrication_job_id: created.id },
  })
  expect(getRes.status).toBe(200)
  const retrieved = await getRes.json<any>()
  expect(retrieved.id).toBe(created.id)
})

test("404s for missing job", async () => {
  const { ky } = await getTestServer()

  const res = await ky.get("fabrication_jobs/get", {
    searchParams: { fabrication_job_id: "job_missing" },
  })
  expect(res.status).toBe(404)
  const body = (await res.json()) as {
    error: { type: string; message: string }
  }
  expect(body.error.type).toBe("invalid_request_error")
  expect(body.error.message).toContain("No such fabrication.job")
})

test("completes steps in order and advances current_step", async () => {
  const { ky } = await getTestServer()
  const created = await createTestJob(ky)

  let job = created
  for (const slug of fabricationStepOrder) {
    expect(job.current_step).toBe(slug)
    await satisfyStepPrecondition(ky, created.id, slug)
    const completeRes = await ky.post("fabrication_jobs/steps/complete", {
      json: { fabrication_job_id: created.id, step: slug },
    })
    expect(completeRes.status).toBe(200)
    job = await completeRes.json<any>()
  }

  expect(job.status).toBe("complete")
  expect(job.current_step).toBeNull()
  for (const step of job.steps) {
    expect(step.status).toBe("complete")
    expect(step.completed_at).not.toBeNull()
  }
})

test("rejects completing an out-of-order step", async () => {
  const { ky } = await getTestServer()
  const created = await createTestJob(ky)

  const res = await ky.post("fabrication_jobs/steps/complete", {
    json: { fabrication_job_id: created.id, step: "top_copper_fill" },
  })
  expect(res.status).toBe(409)
})

test("rejects unknown step slug", async () => {
  const { ky } = await getTestServer()
  const created = await createTestJob(ky)

  const res = await ky.post("fabrication_jobs/steps/complete", {
    json: { fabrication_job_id: created.id, step: "not_a_step" },
  })
  expect(res.status).toBe(400)
})

async function satisfyStepPrecondition(
  ky: Awaited<ReturnType<typeof getTestServer>>["ky"],
  fabricationJobId: string,
  slug: (typeof fabricationStepOrder)[number],
): Promise<void> {
  if (slug === "clamp_pcb") {
    const res = await ky.post("carrier/clamp", {
      json: { fabrication_job_id: fabricationJobId, delta: 1 },
    })
    expect(res.status).toBe(200)
  }
  if (slug === "position_carrier") {
    const res = await ky.post("carrier/move_along_rail", {
      json: { fabrication_job_id: fabricationJobId, x: 1 },
    })
    expect(res.status).toBe(200)
  }
  if (slug === "level_carrier" || slug === "flip_board") {
    const res = await ky.post("carrier/rotate", {
      json: { fabrication_job_id: fabricationJobId, delta_deg: 180 },
    })
    expect(res.status).toBe(200)
  }
  if (slug === "top_alignment") {
    await completeAlignment(ky, fabricationJobId, testLbrnFiles.top_alignment)
  }
  if (slug === "bottom_alignment") {
    await completeAlignment(ky, fabricationJobId, testLbrnFiles.bottom_alignment)
  }
  if (slug === "top_deoxidation") {
    const res = await ky.post("laser/burn", {
      json: { fabrication_job_id: fabricationJobId, lbrn: testLbrnFiles.top_deoxidation },
    })
    expect(res.status).toBe(200)
  }
  if (slug === "top_copper_fill") {
    const res = await ky.post("laser/burn", {
      json: { fabrication_job_id: fabricationJobId, lbrn: testLbrnFiles.top_copper_fill },
    })
    expect(res.status).toBe(200)
  }
  if (slug === "bottom_deoxidation") {
    const res = await ky.post("laser/burn", {
      json: { fabrication_job_id: fabricationJobId, lbrn: testLbrnFiles.bottom_deoxidation },
    })
    expect(res.status).toBe(200)
  }
  if (slug === "bottom_copper_fill") {
    const res = await ky.post("laser/burn", {
      json: { fabrication_job_id: fabricationJobId, lbrn: testLbrnFiles.bottom_copper_fill },
    })
    expect(res.status).toBe(200)
  }
  if (slug === "release_pcb") {
    const moveRes = await ky.post("carrier/move_along_rail", {
      json: { fabrication_job_id: fabricationJobId, x: 10 },
    })
    expect(moveRes.status).toBe(200)
    const rotateRes = await ky.post("carrier/rotate", {
      json: { fabrication_job_id: fabricationJobId, angle_deg: 45 },
    })
    expect(rotateRes.status).toBe(200)
    const clampRes = await ky.post("carrier/clamp", {
      json: { fabrication_job_id: fabricationJobId, delta: -1 },
    })
    expect(clampRes.status).toBe(200)
  }
}

async function completeAlignment(
  ky: Awaited<ReturnType<typeof getTestServer>>["ky"],
  fabricationJobId: string,
  lbrn: string,
): Promise<void> {
  const onRes = await ky.post("laser/alignment", {
    json: { fabrication_job_id: fabricationJobId, lbrn, on: true },
  })
  expect(onRes.status).toBe(200)
  const moveRes = await ky.post("laser/move", {
    json: { fabrication_job_id: fabricationJobId, dx: 1, dy: 1 },
  })
  expect(moveRes.status).toBe(200)
  const offRes = await ky.post("laser/alignment", {
    json: { fabrication_job_id: fabricationJobId, lbrn, on: false },
  })
  expect(offRes.status).toBe(200)
}
