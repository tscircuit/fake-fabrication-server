import { expect, test } from "bun:test"
import { getTestServer, testLbrnFiles } from "tests/fixtures/getTestServer"

async function completeStep(
  ky: Awaited<ReturnType<typeof getTestServer>>["ky"],
  fabricationJobId: string,
  step: string,
): Promise<any> {
  const response = await ky.post("fabrication_jobs/steps/complete", {
    json: { fabrication_job_id: fabricationJobId, step },
  })
  expect(response.status).toBe(200)
  return response.json<any>()
}

async function getJob(
  ky: Awaited<ReturnType<typeof getTestServer>>["ky"],
  fabricationJobId: string,
): Promise<any> {
  const response = await ky.get("fabrication_jobs/get", {
    searchParams: { fabrication_job_id: fabricationJobId },
  })
  expect(response.status).toBe(200)
  return response.json<any>()
}

test("handles the full pcb fabrication process", async () => {
  const { ky } = await getTestServer()

  const lbrnFiles = testLbrnFiles

  const createJobRes = await ky.post("fabrication_jobs/create", {
    json: {
      metadata: { pcb_design_id: "pcb_design_abc" },
      lbrn_files: lbrnFiles,
    },
  })
  expect(createJobRes.status).toBe(200)
  let job = await createJobRes.json<any>()

  expect(job.current_step).toBe("load_pcb")
  expect(job.lbrn_files).toEqual(lbrnFiles)

  job = await completeStep(ky, job.id, "load_pcb")
  expect(job.current_step).toBe("clamp_pcb")

  const clampedRes = await ky.post("carrier/clamp", {
    json: { fabrication_job_id: job.id, delta: 4.5 },
  })
  expect(clampedRes.status).toBe(200)
  const clamped = await clampedRes.json<any>()
  expect(clamped.carrier.clamp_position).toBe(4.5)
  job = await completeStep(ky, job.id, "clamp_pcb")

  expect(job.current_step).toBe("position_carrier")
  const positionedRes = await ky.post("carrier/move_along_rail", {
    json: { fabrication_job_id: job.id, x: 120 },
  })
  expect(positionedRes.status).toBe(200)
  const positioned = await positionedRes.json<any>()
  expect(positioned.carrier.position).toEqual({ x: 120 })
  job = await completeStep(ky, job.id, "position_carrier")

  const leveledRes = await ky.post("carrier/rotate", {
    json: { fabrication_job_id: job.id, delta_deg: 1.25 },
  })
  expect(leveledRes.status).toBe(200)
  const leveled = await leveledRes.json<any>()
  expect(leveled.carrier.rotation_deg).toBe(1.25)
  job = await completeStep(ky, job.id, "level_carrier")

  const alignedLaserRes = await ky.post("laser/alignment", {
    json: { fabrication_job_id: job.id, lbrn: lbrnFiles.top_alignment, on: true },
  })
  expect(alignedLaserRes.status).toBe(200)
  const alignedLaser = await alignedLaserRes.json<any>()
  expect(alignedLaser.laser.alignment_on).toBe(true)
  expect(alignedLaser.laser.alignment_lbrn).toBe(lbrnFiles.top_alignment)

  const alignedRes = await ky.post("laser/move", {
    json: { fabrication_job_id: job.id, dx: 2.5, dy: -1.25 },
  })
  expect(alignedRes.status).toBe(200)
  const aligned = await alignedRes.json<any>()
  expect(aligned.laser.position).toEqual({ x: 2.5, y: -1.25 })

  const topAlignmentOffRes = await ky.post("laser/alignment", {
    json: { fabrication_job_id: job.id, lbrn: lbrnFiles.top_alignment, on: false },
  })
  expect(topAlignmentOffRes.status).toBe(200)
  const topAlignmentOff = await topAlignmentOffRes.json<any>()
  expect(topAlignmentOff.laser.alignment_on).toBe(false)
  expect(topAlignmentOff.laser.alignment_lbrn).toBeNull()

  job = await completeStep(ky, job.id, "top_alignment")
  expect(job.top_alignment_offset).toEqual({ x: 2.5, y: -1.25 })
  expect((await getJob(ky, job.id)).top_alignment_offset).toEqual({
    x: 2.5,
    y: -1.25,
  })

  const topDeoxidationRes = await ky.post("laser/burn", {
    json: { fabrication_job_id: job.id, lbrn: lbrnFiles.top_deoxidation, passes: 2 },
  })
  expect(topDeoxidationRes.status).toBe(200)
  const topDeoxidation = await topDeoxidationRes.json<any>()
  expect(topDeoxidation.laser.last_burn_lbrn).toBe(lbrnFiles.top_deoxidation)
  expect(topDeoxidation.laser.last_burn_passes).toBe(2)
  expect(topDeoxidation.laser.last_burn_offset).toEqual(job.top_alignment_offset)
  expect(topDeoxidation.laser.last_burn_file_content).toContain(
    "LightBurnProject",
  )
  const topDeoxidationExtraPassRes = await ky.post("laser/burn", {
    json: { fabrication_job_id: job.id, lbrn: lbrnFiles.top_deoxidation, passes: 1 },
  })
  expect(topDeoxidationExtraPassRes.status).toBe(200)
  const topDeoxidationExtraPass = await topDeoxidationExtraPassRes.json<any>()
  expect(topDeoxidationExtraPass.laser.last_burn_offset).toEqual(
    job.top_alignment_offset,
  )
  job = await completeStep(ky, job.id, "top_deoxidation")

  const moveAfterTopDeoxidationRes = await ky.post("laser/move", {
    json: { fabrication_job_id: job.id, dx: 5, dy: 5 },
  })
  expect(moveAfterTopDeoxidationRes.status).toBe(200)
  expect((await getJob(ky, job.id)).top_alignment_offset).toEqual({
    x: 2.5,
    y: -1.25,
  })

  const topCopperFillRes = await ky.post("laser/burn", {
    json: { fabrication_job_id: job.id, lbrn: lbrnFiles.top_copper_fill, passes: 3 },
  })
  expect(topCopperFillRes.status).toBe(200)
  const topCopperFill = await topCopperFillRes.json<any>()
  expect(topCopperFill.laser.last_burn_lbrn).toBe(lbrnFiles.top_copper_fill)
  expect(topCopperFill.laser.last_burn_offset).toEqual(job.top_alignment_offset)
  const topCopperFillExtraPassRes = await ky.post("laser/burn", {
    json: { fabrication_job_id: job.id, lbrn: lbrnFiles.top_copper_fill, passes: 1 },
  })
  expect(topCopperFillExtraPassRes.status).toBe(200)
  const topCopperFillExtraPass = await topCopperFillExtraPassRes.json<any>()
  expect(topCopperFillExtraPass.laser.last_burn_offset).toEqual(
    job.top_alignment_offset,
  )
  job = await completeStep(ky, job.id, "top_copper_fill")

  const rotatedRes = await ky.post("carrier/rotate", {
    json: { fabrication_job_id: job.id, delta_deg: 180 },
  })
  expect(rotatedRes.status).toBe(200)
  const rotated = await rotatedRes.json<any>()
  expect(rotated.carrier.rotation_deg).toBe(181.25)
  job = await completeStep(ky, job.id, "flip_board")
  expect(job.current_step).toBe("bottom_alignment")

  const bottomAlignedLaserRes = await ky.post("laser/alignment", {
    json: { fabrication_job_id: job.id, lbrn: lbrnFiles.bottom_alignment, on: true },
  })
  expect(bottomAlignedLaserRes.status).toBe(200)
  const bottomAlignedLaser = await bottomAlignedLaserRes.json<any>()
  expect(bottomAlignedLaser.laser.alignment_on).toBe(true)
  expect(bottomAlignedLaser.laser.alignment_lbrn).toBe(
    lbrnFiles.bottom_alignment,
  )

  const bottomAlignedRes = await ky.post("laser/move", {
    json: { fabrication_job_id: job.id, dx: -1, dy: 0.75 },
  })
  expect(bottomAlignedRes.status).toBe(200)
  const bottomAligned = await bottomAlignedRes.json<any>()
  expect(bottomAligned.laser.position).toEqual({ x: 6.5, y: 4.5 })

  const bottomAlignmentOffRes = await ky.post("laser/alignment", {
    json: { fabrication_job_id: job.id, lbrn: lbrnFiles.bottom_alignment, on: false },
  })
  expect(bottomAlignmentOffRes.status).toBe(200)
  const bottomAlignmentOff = await bottomAlignmentOffRes.json<any>()
  expect(bottomAlignmentOff.laser.alignment_on).toBe(false)
  expect(bottomAlignmentOff.laser.alignment_lbrn).toBeNull()

  job = await completeStep(ky, job.id, "bottom_alignment")
  expect(job.bottom_alignment_offset).toEqual({ x: -1, y: 0.75 })
  expect((await getJob(ky, job.id)).bottom_alignment_offset).toEqual({
    x: -1,
    y: 0.75,
  })

  const bottomDeoxidationRes = await ky.post("laser/burn", {
    json: { fabrication_job_id: job.id, lbrn: lbrnFiles.bottom_deoxidation, passes: 2 },
  })
  expect(bottomDeoxidationRes.status).toBe(200)
  const bottomDeoxidation = await bottomDeoxidationRes.json<any>()
  expect(bottomDeoxidation.laser.last_burn_lbrn).toBe(
    lbrnFiles.bottom_deoxidation,
  )
  expect(bottomDeoxidation.laser.last_burn_offset).toEqual(
    job.bottom_alignment_offset,
  )
  job = await completeStep(ky, job.id, "bottom_deoxidation")

  const bottomCopperFillRes = await ky.post("laser/burn", {
    json: { fabrication_job_id: job.id, lbrn: lbrnFiles.bottom_copper_fill, passes: 3 },
  })
  expect(bottomCopperFillRes.status).toBe(200)
  const bottomCopperFill = await bottomCopperFillRes.json<any>()
  expect(bottomCopperFill.laser.last_burn_lbrn).toBe(
    lbrnFiles.bottom_copper_fill,
  )
  expect(bottomCopperFill.laser.last_burn_offset).toEqual(
    job.bottom_alignment_offset,
  )
  job = await completeStep(ky, job.id, "bottom_copper_fill")
  expect(job.current_step).toBe("release_pcb")

  const dropPositionedRes = await ky.post("carrier/move_along_rail", {
    json: { fabrication_job_id: job.id, x: 10 },
  })
  expect(dropPositionedRes.status).toBe(200)
  const dropPositioned = await dropPositionedRes.json<any>()
  expect(dropPositioned.carrier.position).toEqual({ x: 10 })

  const dropRotatedRes = await ky.post("carrier/rotate", {
    json: { fabrication_job_id: job.id, angle_deg: 45 },
  })
  expect(dropRotatedRes.status).toBe(200)
  const dropRotated = await dropRotatedRes.json<any>()
  expect(dropRotated.carrier.rotation_deg).toBe(45)

  const unclampedRes = await ky.post("carrier/clamp", {
    json: { fabrication_job_id: job.id, delta: -4.5 },
  })
  expect(unclampedRes.status).toBe(200)
  const unclamped = await unclampedRes.json<any>()
  expect(unclamped.carrier.clamp_position).toBe(0)

  job = await completeStep(ky, job.id, "release_pcb")

  job = await completeStep(ky, job.id, "complete")
  expect(job.status).toBe("complete")
  expect(job.current_step).toBeNull()
  expect(job.steps.every((step: any) => step.status === "complete")).toBe(true)
})
