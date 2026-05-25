import { expect, test } from "bun:test"
import {
  createTestJob,
  getTestServer,
} from "tests/fixtures/getTestServer"

test("set_origin records the laser alignment origin", async () => {
  const { ky } = await getTestServer()
  const job = await createTestJob(ky)

  const res = await ky.post("laser/set_origin", {
    json: {
      fabrication_job_id: job.id,
      origin: { x: 2, y: -1 },
    },
  })

  expect(res.status).toBe(200)
  const body = await res.json<any>()
  expect(body.ok).toBe(true)
  expect(body.fabrication_job_id).toBe(job.id)
  expect(body.laser.alignment_origin).toEqual({ x: 2, y: -1 })
})

test("set_origin overwrites the previous origin", async () => {
  const { ky } = await getTestServer()
  const job = await createTestJob(ky)

  await ky.post("laser/set_origin", {
    json: { fabrication_job_id: job.id, origin: { x: 1, y: 1 } },
  })
  const offRes = await ky.post("laser/set_origin", {
    json: { fabrication_job_id: job.id, origin: { x: 3, y: 4 } },
  })
  const off = await offRes.json<any>()
  expect(off.laser.alignment_origin).toEqual({ x: 3, y: 4 })
})

test("burn records the lbrn file", async () => {
  const { ky } = await getTestServer()
  const job = await createTopAlignedJob(ky, (await createTestJob(ky)).id)

  const res = await ky.post("laser/burn", {
    json: {
      fabrication_job_id: job.id,
      lbrn_vfs_path: "top_deoxidation",
    },
  })

  expect(res.status).toBe(200)
  const body = await res.json<any>()
  expect(body.laser.last_burn_lbrn).toBe("top_deoxidation")
  expect(body.laser.last_burn_file_content).toContain("LightBurnProject")
})

test("burn rejects before a burn stage", async () => {
  const { ky } = await getTestServer()
  const job = await createTestJob(ky)

  const res = await ky.post("laser/burn", {
    json: {
      fabrication_job_id: job.id,
      lbrn_vfs_path: "top_deoxidation",
    },
  })

  expect(res.status).toBe(409)
})

test("burn rejects an lbrn that does not match the current stage", async () => {
  const { ky } = await getTestServer()
  const job = await createTopAlignedJob(ky, (await createTestJob(ky)).id)

  const res = await ky.post("laser/burn", {
    json: {
      fabrication_job_id: job.id,
      lbrn_vfs_path: "top_copper_fill",
    },
  })

  expect(res.status).toBe(409)
})

async function createTopAlignedJob(
  ky: Awaited<ReturnType<typeof getTestServer>>["ky"],
  fabricationJobId: string,
): Promise<{ id: string }> {
  const loadRes = await ky.post("fabrication_jobs/next_stage", {
    json: { fabrication_job_id: fabricationJobId, current_stage: "load_pcb" },
  })
  expect(loadRes.status).toBe(200)
  const clampRes = await ky.post("carrier/clamp", {
    json: { fabrication_job_id: fabricationJobId },
  })
  expect(clampRes.status).toBe(200)
  const clampStepRes = await ky.post("fabrication_jobs/next_stage", {
    json: { fabrication_job_id: fabricationJobId, current_stage: "clamp_pcb" },
  })
  expect(clampStepRes.status).toBe(200)
  const moveRes = await ky.post("carrier/move_along_rail", {
    json: { fabrication_job_id: fabricationJobId, x: 1 },
  })
  expect(moveRes.status).toBe(200)
  const positionStepRes = await ky.post("fabrication_jobs/next_stage", {
    json: {
      fabrication_job_id: fabricationJobId,
      current_stage: "move_carrier_under_laser",
    },
  })
  expect(positionStepRes.status).toBe(200)
  const rotateRes = await ky.post("carrier/rotate", {
    json: { fabrication_job_id: fabricationJobId, angle_deg: 1 },
  })
  expect(rotateRes.status).toBe(200)
  const levelStepRes = await ky.post("fabrication_jobs/next_stage", {
    json: {
      fabrication_job_id: fabricationJobId,
      current_stage: "level_carrier",
    },
  })
  expect(levelStepRes.status).toBe(200)
  const topAlignmentStepRes = await ky.post("fabrication_jobs/next_stage", {
    json: {
      fabrication_job_id: fabricationJobId,
      current_stage: "top_alignment",
    },
  })
  expect(topAlignmentStepRes.status).toBe(200)
  const originRes = await ky.post("laser/set_origin", {
    json: {
      fabrication_job_id: fabricationJobId,
      origin: { x: 1, y: 1 },
    },
  })
  expect(originRes.status).toBe(200)
  return { id: fabricationJobId }
}
