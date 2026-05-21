import type {
  Job,
  LaserBurnRequest,
  LaserMoveRequest,
  LaserResponse,
  LaserSetOriginRequest,
  LaserState,
} from "./db/schema"
import type { AppContext } from "./types"
import { requireJob, updateJob } from "./job-store"
import { apiError, nowSeconds } from "./utils"

const TOP_BURN_STAGES = new Set(["top_deoxidation", "top_copper_fill"])
const BOTTOM_BURN_STAGES = new Set(["bottom_deoxidation", "bottom_copper_fill"])

export function setLaserOrigin(
  body: LaserSetOriginRequest,
  ctx: AppContext,
): LaserResponse | Response {
  const job = requireJob(ctx.db, body.fabrication_job_id)
  if (job instanceof Response) return job

  const laser: LaserState = {
    ...job.laser,
    alignment_origin: body.origin,
    last_command_at: nowSeconds(),
  }
  const updatedJob = {
    ...job,
    laser,
    top_alignment_origin:
      job.current_stage && TOP_BURN_STAGES.has(job.current_stage)
        ? body.origin
        : job.top_alignment_origin,
    bottom_alignment_origin:
      job.current_stage && BOTTOM_BURN_STAGES.has(job.current_stage)
        ? body.origin
        : job.bottom_alignment_origin,
  }
  const updated = updateJob(ctx.db, updatedJob)
  return {
    fabrication_job_id: updated.id,
    laser: updated.laser,
  }
}

export function moveLaser(
  body: LaserMoveRequest,
  ctx: AppContext,
): LaserResponse | Response {
  const job = requireJob(ctx.db, body.fabrication_job_id)
  if (job instanceof Response) return job

  const laser: LaserState = {
    ...job.laser,
    position: {
      x: job.laser.position.x + body.dx,
      y: job.laser.position.y + body.dy,
    },
    last_command_at: nowSeconds(),
  }
  const updated = updateJob(ctx.db, { ...job, laser })
  return {
    fabrication_job_id: updated.id,
    laser: updated.laser,
  }
}

export function burnLaser(
  body: LaserBurnRequest,
  ctx: AppContext,
): LaserResponse | Response {
  const job = requireJob(ctx.db, body.fabrication_job_id)
  if (job instanceof Response) return job

  const expectedLbrn = getExpectedBurnLbrn(job)
  if (expectedLbrn instanceof Response) {
    return expectedLbrn
  }
  if (body.lbrn_vfs_path !== expectedLbrn) {
    return apiError(
      `Expected burn lbrn '${expectedLbrn}' for stage '${job.current_stage}'`,
      409,
    )
  }

  let origin = job.top_alignment_origin
  if (
    job.current_stage === "bottom_deoxidation" ||
    job.current_stage === "bottom_copper_fill"
  ) {
    origin = job.bottom_alignment_origin
  }
  if (origin == null) {
    return apiError(
      `No saved alignment origin for stage '${job.current_stage}'`,
      409,
    )
  }

  const last_burn_file_content = job.lbrn_files[body.lbrn_vfs_path] ?? null
  const passes = body.passes ?? 1
  const laserBurnRun = {
    laser_burn_run_id: ctx.db.createId("laser_burn_run"),
    fabrication_job_id: job.id,
    lbrn_vfs_path: body.lbrn_vfs_path,
    passes,
    origin,
    file_content: last_burn_file_content,
    created: nowSeconds(),
  }
  ctx.db.addLaserBurnRun(laserBurnRun)

  const laser: LaserState = {
    ...job.laser,
    last_burn_lbrn: body.lbrn_vfs_path,
    last_burn_passes: passes,
    last_burn_origin: origin,
    last_burn_file_content,
    last_command_at: nowSeconds(),
  }
  const updated = updateJob(ctx.db, { ...job, laser })
  return {
    fabrication_job_id: updated.id,
    laser: updated.laser,
    laser_burn_run: laserBurnRun,
  }
}

const burnableStages = new Set([
  "top_deoxidation",
  "top_copper_fill",
  "bottom_deoxidation",
  "bottom_copper_fill",
])

function getExpectedBurnLbrn(job: Job): string | Response {
  if (job.current_stage && burnableStages.has(job.current_stage)) {
    return job.current_stage
  }
  return apiError(`Cannot burn during stage '${job.current_stage}'`, 409)
}

export const setLaserAlignment = setLaserOrigin
