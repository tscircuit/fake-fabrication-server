import { expect, test } from "bun:test"
import {
  type CarrierResponse,
  type FabricationStepSlug,
  type Job,
  type LaserResponse,
} from "../lib/index"
import { getTestServer } from "./utils"

async function postJson<T>(
  serverUrl: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  let requestBody = "{}"
  if (body != null) {
    requestBody = JSON.stringify(body)
  }

  const response = await fetch(`${serverUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: requestBody,
  })

  expect(response.status).toBe(200)
  return (await response.json()) as T
}

async function completeStep(
  serverUrl: string,
  jobId: string,
  step: FabricationStepSlug,
): Promise<Job> {
  return postJson<Job>(serverUrl, `/v1/jobs/${jobId}/steps/${step}/complete`)
}

async function getJob(serverUrl: string, jobId: string): Promise<Job> {
  const response = await fetch(`${serverUrl}/v1/jobs/${jobId}`)
  expect(response.status).toBe(200)
  return (await response.json()) as Job
}

test("handles the full pcb fabrication process", async () => {
  const server = await getTestServer()

  const lbrnFiles = {
    top_alignment: "https://fake-r2.tscircuit.com/job_abc/top-alignment.lbrn",
    bottom_alignment:
      "https://fake-r2.tscircuit.com/job_abc/bottom-alignment.lbrn",
    top_deoxidation:
      "https://fake-r2.tscircuit.com/job_abc/top-deoxidation.lbrn",
    top_copper_fill:
      "https://fake-r2.tscircuit.com/job_abc/top-copper-fill.lbrn",
    bottom_deoxidation:
      "https://fake-r2.tscircuit.com/job_abc/bottom-deoxidation.lbrn",
    bottom_copper_fill:
      "https://fake-r2.tscircuit.com/job_abc/bottom-copper-fill.lbrn",
  }

  let job = await postJson<Job>(server.url, "/v1/jobs", {
    metadata: { pcb_design_id: "pcb_design_abc" },
    lbrn_files: lbrnFiles,
  })

  expect(job.current_step).toBe("load_pcb")
  expect(job.lbrn_files).toEqual(lbrnFiles)

  job = await completeStep(server.url, job.id, "load_pcb")
  expect(job.current_step).toBe("clamp_pcb")

  const clamped = await postJson<CarrierResponse>(
    server.url,
    "/v1/carrier/clamp",
    {
      job_id: job.id,
      delta: 4.5,
    },
  )
  expect(clamped.carrier.clamp_position).toBe(4.5)
  job = await completeStep(server.url, job.id, "clamp_pcb")

  expect(job.current_step).toBe("position_carrier")
  const positioned = await postJson<CarrierResponse>(
    server.url,
    "/v1/carrier/move",
    {
      job_id: job.id,
      x: 120,
    },
  )
  expect(positioned.carrier.position).toEqual({ x: 120 })
  job = await completeStep(server.url, job.id, "position_carrier")

  const leveled = await postJson<CarrierResponse>(
    server.url,
    "/v1/carrier/rotate",
    {
      job_id: job.id,
      delta_deg: 1.25,
    },
  )
  expect(leveled.carrier.rotation_deg).toBe(1.25)
  job = await completeStep(server.url, job.id, "level_carrier")

  const alignedLaser = await postJson<LaserResponse>(
    server.url,
    "/v1/laser/alignment",
    {
      job_id: job.id,
      lbrn: lbrnFiles.top_alignment,
      on: true,
    },
  )
  expect(alignedLaser.laser.alignment_on).toBe(true)
  expect(alignedLaser.laser.alignment_lbrn).toBe(lbrnFiles.top_alignment)

  const aligned = await postJson<LaserResponse>(server.url, "/v1/laser/move", {
    job_id: job.id,
    dx: 2.5,
    dy: -1.25,
  })
  expect(aligned.laser.position).toEqual({ x: 2.5, y: -1.25 })

  const topAlignmentOff = await postJson<LaserResponse>(
    server.url,
    "/v1/laser/alignment",
    {
      job_id: job.id,
      lbrn: lbrnFiles.top_alignment,
      on: false,
    },
  )
  expect(topAlignmentOff.laser.alignment_on).toBe(false)
  expect(topAlignmentOff.laser.alignment_lbrn).toBeNull()

  job = await completeStep(server.url, job.id, "top_alignment")
  expect(job.top_alignment_offset).toEqual({ x: 2.5, y: -1.25 })
  expect((await getJob(server.url, job.id)).top_alignment_offset).toEqual({
    x: 2.5,
    y: -1.25,
  })

  const topDeoxidation = await postJson<LaserResponse>(
    server.url,
    "/v1/laser/burn",
    {
      job_id: job.id,
      lbrn: lbrnFiles.top_deoxidation,
      passes: 2,
    },
  )
  expect(topDeoxidation.laser.last_burn_lbrn).toBe(lbrnFiles.top_deoxidation)
  expect(topDeoxidation.laser.last_burn_passes).toBe(2)
  expect(topDeoxidation.laser.last_burn_offset).toEqual(
    job.top_alignment_offset,
  )
  expect(topDeoxidation.laser.last_burn_file_content).toContain(
    "LightBurnProject",
  )
  const topDeoxidationExtraPass = await postJson<LaserResponse>(
    server.url,
    "/v1/laser/burn",
    {
      job_id: job.id,
      lbrn: lbrnFiles.top_deoxidation,
      passes: 1,
    },
  )
  expect(topDeoxidationExtraPass.laser.last_burn_offset).toEqual(
    job.top_alignment_offset,
  )
  job = await completeStep(server.url, job.id, "top_deoxidation")

  await postJson<LaserResponse>(server.url, "/v1/laser/move", {
    job_id: job.id,
    dx: 5,
    dy: 5,
  })
  expect((await getJob(server.url, job.id)).top_alignment_offset).toEqual({
    x: 2.5,
    y: -1.25,
  })

  const topCopperFill = await postJson<LaserResponse>(
    server.url,
    "/v1/laser/burn",
    {
      job_id: job.id,
      lbrn: lbrnFiles.top_copper_fill,
      passes: 3,
    },
  )
  expect(topCopperFill.laser.last_burn_lbrn).toBe(lbrnFiles.top_copper_fill)
  expect(topCopperFill.laser.last_burn_offset).toEqual(job.top_alignment_offset)
  const topCopperFillExtraPass = await postJson<LaserResponse>(
    server.url,
    "/v1/laser/burn",
    {
      job_id: job.id,
      lbrn: lbrnFiles.top_copper_fill,
      passes: 1,
    },
  )
  expect(topCopperFillExtraPass.laser.last_burn_offset).toEqual(
    job.top_alignment_offset,
  )
  job = await completeStep(server.url, job.id, "top_copper_fill")

  const rotated = await postJson<CarrierResponse>(
    server.url,
    "/v1/carrier/rotate",
    {
      job_id: job.id,
      delta_deg: 180,
    },
  )
  expect(rotated.carrier.rotation_deg).toBe(181.25)
  job = await completeStep(server.url, job.id, "flip_board")
  expect(job.current_step).toBe("bottom_alignment")

  const bottomAlignedLaser = await postJson<LaserResponse>(
    server.url,
    "/v1/laser/alignment",
    {
      job_id: job.id,
      lbrn: lbrnFiles.bottom_alignment,
      on: true,
    },
  )
  expect(bottomAlignedLaser.laser.alignment_on).toBe(true)
  expect(bottomAlignedLaser.laser.alignment_lbrn).toBe(
    lbrnFiles.bottom_alignment,
  )

  const bottomAligned = await postJson<LaserResponse>(
    server.url,
    "/v1/laser/move",
    {
      job_id: job.id,
      dx: -1,
      dy: 0.75,
    },
  )
  expect(bottomAligned.laser.position).toEqual({ x: 6.5, y: 4.5 })

  const bottomAlignmentOff = await postJson<LaserResponse>(
    server.url,
    "/v1/laser/alignment",
    {
      job_id: job.id,
      lbrn: lbrnFiles.bottom_alignment,
      on: false,
    },
  )
  expect(bottomAlignmentOff.laser.alignment_on).toBe(false)
  expect(bottomAlignmentOff.laser.alignment_lbrn).toBeNull()

  job = await completeStep(server.url, job.id, "bottom_alignment")
  expect(job.bottom_alignment_offset).toEqual({ x: -1, y: 0.75 })
  expect((await getJob(server.url, job.id)).bottom_alignment_offset).toEqual({
    x: -1,
    y: 0.75,
  })

  const bottomDeoxidation = await postJson<LaserResponse>(
    server.url,
    "/v1/laser/burn",
    {
      job_id: job.id,
      lbrn: lbrnFiles.bottom_deoxidation,
      passes: 2,
    },
  )
  expect(bottomDeoxidation.laser.last_burn_lbrn).toBe(
    lbrnFiles.bottom_deoxidation,
  )
  expect(bottomDeoxidation.laser.last_burn_offset).toEqual(
    job.bottom_alignment_offset,
  )
  job = await completeStep(server.url, job.id, "bottom_deoxidation")

  const bottomCopperFill = await postJson<LaserResponse>(
    server.url,
    "/v1/laser/burn",
    {
      job_id: job.id,
      lbrn: lbrnFiles.bottom_copper_fill,
      passes: 3,
    },
  )
  expect(bottomCopperFill.laser.last_burn_lbrn).toBe(
    lbrnFiles.bottom_copper_fill,
  )
  expect(bottomCopperFill.laser.last_burn_offset).toEqual(
    job.bottom_alignment_offset,
  )
  job = await completeStep(server.url, job.id, "bottom_copper_fill")
  expect(job.current_step).toBe("release_pcb")

  const dropPositioned = await postJson<CarrierResponse>(
    server.url,
    "/v1/carrier/move",
    {
      job_id: job.id,
      x: 10,
    },
  )
  expect(dropPositioned.carrier.position).toEqual({ x: 10 })

  const dropRotated = await postJson<CarrierResponse>(
    server.url,
    "/v1/carrier/rotate",
    {
      job_id: job.id,
      angle_deg: 45,
    },
  )
  expect(dropRotated.carrier.rotation_deg).toBe(45)

  const unclamped = await postJson<CarrierResponse>(
    server.url,
    "/v1/carrier/clamp",
    {
      job_id: job.id,
      delta: -4.5,
    },
  )
  expect(unclamped.carrier.clamp_position).toBe(0)

  job = await completeStep(server.url, job.id, "release_pcb")

  job = await completeStep(server.url, job.id, "complete")
  expect(job.status).toBe("complete")
  expect(job.current_step).toBeNull()
  expect(job.steps.every((step) => step.status === "complete")).toBe(true)
})
