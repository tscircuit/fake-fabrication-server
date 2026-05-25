import { expect, test } from "bun:test"
import {
  fabricationStageOrder,
  createTestJob,
  getTestServer,
  testLbrnFiles,
} from "tests/fixtures/getTestServer"

test("creates a fabrication job with all stages pending except first", async () => {
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
  expect(job.current_stage).toBe("load_pcb")
  expect(job.stages).toHaveLength(14)
  expect(job.stages[0]!.status).toBe("in_progress")
  expect(job.stages[1]!.status).toBe("pending")
  expect(job.stages[1]!.slug).toBe("clamp_pcb")
  expect(job.metadata.order_id).toBe("order_1")
  expect(job.laser.position).toEqual({ x: 0, y: 0 })
  expect(job.top_alignment_origin).toBeNull()
  expect(job.bottom_alignment_origin).toBeNull()
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

test("completes stages in order and advances current_stage", async () => {
  const { ky } = await getTestServer()
  const created = await createTestJob(ky)

  let job = created
  for (const slug of fabricationStageOrder) {
    expect(job.current_stage).toBe(slug)
    await satisfyStagePrecondition(ky, created.id, slug)
    const completeRes = await ky.post("fabrication_jobs/next_stage", {
      json: { fabrication_job_id: created.id, current_stage: slug },
    })
    expect(completeRes.status).toBe(200)
    job = await completeRes.json<any>()
  }

  expect(job.status).toBe("complete")
  expect(job.current_stage).toBeNull()
  for (const stage of job.stages) {
    expect(stage.status).toBe("complete")
    expect(stage.completed_at).not.toBeNull()
  }
})

test("rejects completing an out-of-order stage", async () => {
  const { ky } = await getTestServer()
  const created = await createTestJob(ky)

  const res = await ky.post("fabrication_jobs/next_stage", {
    json: { fabrication_job_id: created.id, current_stage: "top_copper_fill" },
  })
  expect(res.status).toBe(409)
})

test("rejects unknown stage slug", async () => {
  const { ky } = await getTestServer()
  const created = await createTestJob(ky)

  const res = await ky.post("fabrication_jobs/next_stage", {
    json: { fabrication_job_id: created.id, current_stage: "not_a_step" },
  })
  expect(res.status).toBe(400)
})

async function satisfyStagePrecondition(
  ky: Awaited<ReturnType<typeof getTestServer>>["ky"],
  fabricationJobId: string,
  slug: (typeof fabricationStageOrder)[number],
): Promise<void> {
  if (slug === "clamp_pcb") {
    const res = await ky.post("carrier/clamp", {
      json: { fabrication_job_id: fabricationJobId },
    })
    expect(res.status).toBe(200)
  }
  if (slug === "move_carrier_under_laser") {
    const res = await ky.post("carrier/move_along_rail", {
      json: { fabrication_job_id: fabricationJobId, x: 1 },
    })
    expect(res.status).toBe(200)
  }
  if (slug === "level_carrier") {
    const res = await ky.post("carrier/rotate", {
      json: { fabrication_job_id: fabricationJobId, angle_deg: 180 },
    })
    expect(res.status).toBe(200)
  }
  if (slug === "flip_board") {
    const res = await ky.post("carrier/rotate_to_orientation", {
      json: { fabrication_job_id: fabricationJobId, orientation: "bottom" },
    })
    expect(res.status).toBe(200)
  }
  if (slug === "top_deoxidation") {
    await ky.post("laser/set_origin", {
      json: { fabrication_job_id: fabricationJobId, origin: { x: 1, y: 1 } },
    })
    const res = await ky.post("laser/burn", {
      json: {
        fabrication_job_id: fabricationJobId,
        lbrn_vfs_path: "top_deoxidation",
      },
    })
    expect(res.status).toBe(200)
  }
  if (slug === "top_copper_fill") {
    const res = await ky.post("laser/burn", {
      json: {
        fabrication_job_id: fabricationJobId,
        lbrn_vfs_path: "top_copper_fill",
      },
    })
    expect(res.status).toBe(200)
  }
  if (slug === "bottom_deoxidation") {
    await ky.post("laser/set_origin", {
      json: { fabrication_job_id: fabricationJobId, origin: { x: 1, y: 1 } },
    })
    const res = await ky.post("laser/burn", {
      json: {
        fabrication_job_id: fabricationJobId,
        lbrn_vfs_path: "bottom_deoxidation",
      },
    })
    expect(res.status).toBe(200)
  }
  if (slug === "bottom_copper_fill") {
    const res = await ky.post("laser/burn", {
      json: {
        fabrication_job_id: fabricationJobId,
        lbrn_vfs_path: "bottom_copper_fill",
      },
    })
    expect(res.status).toBe(200)
  }
  if (slug === "move_carrier_to_loading_position") {
    const moveRes = await ky.post("carrier/move_along_rail", {
      json: { fabrication_job_id: fabricationJobId, x: 10 },
    })
    expect(moveRes.status).toBe(200)
  }
  if (slug === "release_pcb") {
    const clampRes = await ky.post("carrier/release", {
      json: { fabrication_job_id: fabricationJobId },
    })
    expect(clampRes.status).toBe(200)
  }
}

