import { expect, test } from "bun:test"
import { getTestServer, testLbrnFiles } from "tests/fixtures/getTestServer"

async function completeStep(
  ky: Awaited<ReturnType<typeof getTestServer>>["ky"],
  fabricationJobId: string,
  stage: string,
): Promise<any> {
  const response = await ky.post("fabrication_jobs/next_stage", {
    json: { fabrication_job_id: fabricationJobId, current_stage: stage },
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

  expect(job.current_stage).toBe("load_pcb")
  expect(job.lbrn_files).toEqual(lbrnFiles)

  job = await completeStep(ky, job.id, "load_pcb")
  expect(job.current_stage).toBe("clamp_pcb")

  const clampedRes = await ky.post("carrier/clamp", {
    json: { fabrication_job_id: job.id },
  })
  expect(clampedRes.status).toBe(200)
  const clamped = await clampedRes.json<any>()
  expect(clamped.carrier.clamp_position).toBe(1)
  job = await completeStep(ky, job.id, "clamp_pcb")

  expect(job.current_stage).toBe("move_carrier_under_laser")
  const positionedRes = await ky.post("carrier/move_along_rail", {
    json: { fabrication_job_id: job.id, x: 120 },
  })
  expect(positionedRes.status).toBe(200)
  const positioned = await positionedRes.json<any>()
  expect(positioned.carrier.position).toEqual({ x: 120 })
  job = await completeStep(ky, job.id, "move_carrier_under_laser")

  const leveledRes = await ky.post("carrier/rotate", {
    json: { fabrication_job_id: job.id, angle_deg: 1.25 },
  })
  expect(leveledRes.status).toBe(200)
  const leveled = await leveledRes.json<any>()
  expect(leveled.carrier.rotation_deg).toBe(1.25)
  job = await completeStep(ky, job.id, "level_carrier")

  job = await completeStep(ky, job.id, "top_alignment")

  const topOriginRes = await ky.post("laser/set_origin", {
    json: { fabrication_job_id: job.id, origin: { x: 2.5, y: -1.25 } },
  })
  expect(topOriginRes.status).toBe(200)
  expect((await getJob(ky, job.id)).top_alignment_origin).toEqual({ x: 2.5, y: -1.25 })

  const topDeoxidationRes = await ky.post("laser/burn", {
    json: {
      fabrication_job_id: job.id,
      lbrn_vfs_path: "top_deoxidation",
      passes: 2,
    },
  })
  expect(topDeoxidationRes.status).toBe(200)
  const topDeoxidation = await topDeoxidationRes.json<any>()
  expect(topDeoxidation.laser.last_burn_lbrn).toBe("top_deoxidation")
  expect(topDeoxidation.laser.last_burn_passes).toBe(2)
  expect(topDeoxidation.laser.last_burn_origin).toEqual({ x: 2.5, y: -1.25 })
  expect(topDeoxidation.laser.last_burn_file_content).toContain(
    "LightBurnProject",
  )
  const topDeoxidationExtraPassRes = await ky.post("laser/burn", {
    json: {
      fabrication_job_id: job.id,
      lbrn_vfs_path: "top_deoxidation",
      passes: 1,
    },
  })
  expect(topDeoxidationExtraPassRes.status).toBe(200)
  const topDeoxidationExtraPass = await topDeoxidationExtraPassRes.json<any>()
  expect(topDeoxidationExtraPass.laser.last_burn_origin).toEqual({ x: 2.5, y: -1.25 })
  job = await completeStep(ky, job.id, "top_deoxidation")

  const topCopperFillRes = await ky.post("laser/burn", {
    json: {
      fabrication_job_id: job.id,
      lbrn_vfs_path: "top_copper_fill",
      passes: 3,
    },
  })
  expect(topCopperFillRes.status).toBe(200)
  const topCopperFill = await topCopperFillRes.json<any>()
  expect(topCopperFill.laser.last_burn_lbrn).toBe("top_copper_fill")
  expect(topCopperFill.laser.last_burn_origin).toEqual(job.top_alignment_origin)
  const topCopperFillExtraPassRes = await ky.post("laser/burn", {
    json: {
      fabrication_job_id: job.id,
      lbrn_vfs_path: "top_copper_fill",
      passes: 1,
    },
  })
  expect(topCopperFillExtraPassRes.status).toBe(200)
  const topCopperFillExtraPass = await topCopperFillExtraPassRes.json<any>()
  expect(topCopperFillExtraPass.laser.last_burn_origin).toEqual(
    job.top_alignment_origin,
  )
  job = await completeStep(ky, job.id, "top_copper_fill")

  const rotatedRes = await ky.post("carrier/rotate_to_orientation", {
    json: { fabrication_job_id: job.id, orientation: "bottom" },
  })
  expect(rotatedRes.status).toBe(200)
  const rotated = await rotatedRes.json<any>()
  expect(rotated.carrier.orientation).toBe("bottom")
  job = await completeStep(ky, job.id, "flip_board")
  expect(job.current_stage).toBe("bottom_alignment")

  job = await completeStep(ky, job.id, "bottom_alignment")

  const bottomOriginRes = await ky.post("laser/set_origin", {
    json: { fabrication_job_id: job.id, origin: { x: -1, y: 0.75 } },
  })
  expect(bottomOriginRes.status).toBe(200)
  expect((await getJob(ky, job.id)).bottom_alignment_origin).toEqual({ x: -1, y: 0.75 })

  const bottomDeoxidationRes = await ky.post("laser/burn", {
    json: {
      fabrication_job_id: job.id,
      lbrn_vfs_path: "bottom_deoxidation",
      passes: 2,
    },
  })
  expect(bottomDeoxidationRes.status).toBe(200)
  const bottomDeoxidation = await bottomDeoxidationRes.json<any>()
  expect(bottomDeoxidation.laser.last_burn_lbrn).toBe("bottom_deoxidation")
  expect(bottomDeoxidation.laser.last_burn_origin).toEqual({ x: -1, y: 0.75 })
  job = await completeStep(ky, job.id, "bottom_deoxidation")

  const bottomCopperFillRes = await ky.post("laser/burn", {
    json: {
      fabrication_job_id: job.id,
      lbrn_vfs_path: "bottom_copper_fill",
      passes: 3,
    },
  })
  expect(bottomCopperFillRes.status).toBe(200)
  const bottomCopperFill = await bottomCopperFillRes.json<any>()
  expect(bottomCopperFill.laser.last_burn_lbrn).toBe("bottom_copper_fill")
  expect(bottomCopperFill.laser.last_burn_origin).toEqual(
    job.bottom_alignment_origin,
  )
  job = await completeStep(ky, job.id, "bottom_copper_fill")
  expect(job.current_stage).toBe("move_carrier_to_loading_position")

  const dropPositionedRes = await ky.post("carrier/move_along_rail", {
    json: { fabrication_job_id: job.id, x: 10 },
  })
  expect(dropPositionedRes.status).toBe(200)
  const dropPositioned = await dropPositionedRes.json<any>()
  expect(dropPositioned.carrier.position).toEqual({ x: 10 })

  job = await completeStep(ky, job.id, "move_carrier_to_loading_position")
  expect(job.current_stage).toBe("release_pcb")

  const releasedRes = await ky.post("carrier/release", {
    json: { fabrication_job_id: job.id },
  })
  expect(releasedRes.status).toBe(200)

  job = await completeStep(ky, job.id, "release_pcb")

  job = await completeStep(ky, job.id, "complete")
  expect(job.status).toBe("complete")
  expect(job.current_stage).toBeNull()
  expect(job.stages.every((stage: any) => stage.status === "complete")).toBe(
    true,
  )
})
