import { expect, test } from "bun:test"
import {
  createTestJob,
  getTestServer,
  testLbrnFiles,
} from "tests/fixtures/getTestServer"

test("alignment turns laser alignment on with an lbrn file", async () => {
  const { ky } = await getTestServer()
  const job = await createTestJob(ky)

  const res = await ky.post("laser/alignment", {
    json: {
      fabrication_job_id: job.id,
      lbrn: "top-alignment.lbrn",
      on: true,
    },
  })

  expect(res.status).toBe(200)
  const body = await res.json<any>()
  expect(body.ok).toBe(true)
  expect(body.fabrication_job_id).toBe(job.id)
  expect(body.laser.alignment_on).toBe(true)
  expect(body.laser.alignment_lbrn).toBe("top-alignment.lbrn")
})

test("alignment off clears lbrn", async () => {
  const { ky } = await getTestServer()
  const job = await createTestJob(ky)

  await ky.post("laser/alignment", {
    json: { fabrication_job_id: job.id, lbrn: "x.lbrn", on: true },
  })
  const offRes = await ky.post("laser/alignment", {
    json: { fabrication_job_id: job.id, lbrn: "x.lbrn", on: false },
  })
  const off = await offRes.json<any>()
  expect(off.laser.alignment_on).toBe(false)
  expect(off.laser.alignment_lbrn).toBeNull()
})

test("move sets laser position", async () => {
  const { ky } = await getTestServer()
  const job = await createTestJob(ky)

  const res = await ky.post("laser/move", {
    json: { fabrication_job_id: job.id, dx: 12.5, dy: -3.25 },
  })

  expect(res.status).toBe(200)
  const body = await res.json<any>()
  expect(body.laser.position).toEqual({ x: 12.5, y: -3.25 })
})

test("burn records the lbrn file", async () => {
  const { ky } = await getTestServer()
  const job = await createTopAlignedJob(ky, (await createTestJob(ky)).id)

  const res = await ky.post("laser/burn", {
    json: {
      fabrication_job_id: job.id,
      lbrn: testLbrnFiles.top_deoxidation,
    },
  })

  expect(res.status).toBe(200)
  const body = await res.json<any>()
  expect(body.laser.last_burn_lbrn).toBe(testLbrnFiles.top_deoxidation)
  expect(body.laser.last_burn_file_content).toContain("LightBurnProject")
})

test("burn rejects before a burn step", async () => {
  const { ky } = await getTestServer()
  const job = await createTestJob(ky)

  const res = await ky.post("laser/burn", {
    json: {
      fabrication_job_id: job.id,
      lbrn: testLbrnFiles.top_deoxidation,
    },
  })

  expect(res.status).toBe(409)
})

test("burn rejects an lbrn that does not match the current step", async () => {
  const { ky } = await getTestServer()
  const job = await createTopAlignedJob(ky, (await createTestJob(ky)).id)

  const res = await ky.post("laser/burn", {
    json: {
      fabrication_job_id: job.id,
      lbrn: testLbrnFiles.top_copper_fill,
    },
  })

  expect(res.status).toBe(409)
})

test("laser commands 404 for unknown job", async () => {
  const { ky } = await getTestServer()

  const res = await ky.post("laser/move", {
    json: { fabrication_job_id: "job_missing", dx: 0, dy: 0 },
  })
  expect(res.status).toBe(404)
})

async function createTopAlignedJob(
  ky: Awaited<ReturnType<typeof getTestServer>>["ky"],
  fabricationJobId: string,
): Promise<{ id: string }> {
  const loadRes = await ky.post("fabrication_jobs/steps/complete", {
    json: { fabrication_job_id: fabricationJobId, step: "load_pcb" },
  })
  expect(loadRes.status).toBe(200)
  const clampRes = await ky.post("carrier/clamp", {
    json: { fabrication_job_id: fabricationJobId, delta: 1 },
  })
  expect(clampRes.status).toBe(200)
  const clampStepRes = await ky.post("fabrication_jobs/steps/complete", {
    json: { fabrication_job_id: fabricationJobId, step: "clamp_pcb" },
  })
  expect(clampStepRes.status).toBe(200)
  const moveRes = await ky.post("carrier/move_along_rail", {
    json: { fabrication_job_id: fabricationJobId, x: 1 },
  })
  expect(moveRes.status).toBe(200)
  const positionStepRes = await ky.post("fabrication_jobs/steps/complete", {
    json: { fabrication_job_id: fabricationJobId, step: "position_carrier" },
  })
  expect(positionStepRes.status).toBe(200)
  const rotateRes = await ky.post("carrier/rotate", {
    json: { fabrication_job_id: fabricationJobId, delta_deg: 1 },
  })
  expect(rotateRes.status).toBe(200)
  const levelStepRes = await ky.post("fabrication_jobs/steps/complete", {
    json: { fabrication_job_id: fabricationJobId, step: "level_carrier" },
  })
  expect(levelStepRes.status).toBe(200)
  const alignmentOnRes = await ky.post("laser/alignment", {
    json: {
      fabrication_job_id: fabricationJobId,
      lbrn: testLbrnFiles.top_alignment,
      on: true,
    },
  })
  expect(alignmentOnRes.status).toBe(200)
  const laserMoveRes = await ky.post("laser/move", {
    json: { fabrication_job_id: fabricationJobId, dx: 1, dy: 1 },
  })
  expect(laserMoveRes.status).toBe(200)
  const alignmentOffRes = await ky.post("laser/alignment", {
    json: {
      fabrication_job_id: fabricationJobId,
      lbrn: testLbrnFiles.top_alignment,
      on: false,
    },
  })
  expect(alignmentOffRes.status).toBe(200)
  const topAlignmentStepRes = await ky.post("fabrication_jobs/steps/complete", {
    json: { fabrication_job_id: fabricationJobId, step: "top_alignment" },
  })
  expect(topAlignmentStepRes.status).toBe(200)
  return { id: fabricationJobId }
}
