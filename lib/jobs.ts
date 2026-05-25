import type {
  CreateJobRequest,
  FabricationStage,
  FabricationStageSlug,
  Job,
} from "./db/schema"
import type { AppContext } from "./types"
import { requireJob, updateJob } from "./job-store"
import { buildInitialStages, getNextStage } from "./steps"
import { apiError, normalizeMetadata, nowSeconds } from "./utils"

const INITIAL_LASER_STATE = {
  alignment_origin: null,
  position: { x: 0, y: 0 },
  last_burn_lbrn: null,
  last_burn_passes: null,
  last_burn_origin: null,
  last_burn_file_content: null,
  last_command_at: null,
} as const

const INITIAL_CARRIER_STATE = {
  position: { x: 0 },
  has_been_moved: false,
  rotation_deg: 0,
  orientation: null,
  clamp_position: 0,
  last_command_at: null,
} as const

export async function createJob(
  body: CreateJobRequest,
  ctx: AppContext,
): Promise<Job | Response> {
  const id = ctx.db.createId("job")
  const stages = buildInitialStages()
  const firstStage = stages[0]!

  stages[0] = {
    ...firstStage,
    status: "in_progress",
    started_at: nowSeconds(),
  }

  const job: Job = {
    id,
    object: "fabrication.job",
    created: nowSeconds(),
    status: "in_progress",
    current_stage: firstStage.slug,
    stages,
    laser: { ...INITIAL_LASER_STATE },
    carrier: { ...INITIAL_CARRIER_STATE },
    lbrn_files: body.lbrn_files,
    top_alignment_origin: null,
    bottom_alignment_origin: null,
    metadata: normalizeMetadata(body.metadata),
  }

  return updateJob(ctx.db, job)
}

export function retrieveJob(
  params: { fabrication_job_id: string },
  ctx: AppContext,
): Job | Response {
  return requireJob(ctx.db, params.fabrication_job_id)
}

export function listJobs(
  _params: { limit?: number },
  ctx: AppContext,
): Job[] {
  return ctx.db.listJobs()
}

export function advanceStage(
  params: { fabrication_job_id: string; current_stage: FabricationStageSlug },
  ctx: AppContext,
): Job | Response {
  const job = requireJob(ctx.db, params.fabrication_job_id)
  if (job instanceof Response) return job

  const stageIndex = job.stages.findIndex((s) => s.slug === params.current_stage)
  if (stageIndex === -1) {
    return apiError(
      `No such stage '${params.current_stage}' on job '${params.fabrication_job_id}'`,
      404,
    )
  }

  const stage = job.stages[stageIndex]!
  if (stage.status === "complete") {
    return apiError(`Stage '${params.current_stage}' is already complete`, 409)
  }
  if (job.current_stage !== params.current_stage) {
    return apiError(
      `Stage '${params.current_stage}' is not the current stage (current: '${job.current_stage}')`,
      409,
    )
  }

  const preconditionError = validateStageCompletion(job, params.current_stage)
  if (preconditionError != null) {
    return apiError(preconditionError, 409)
  }

  const now = nowSeconds()
  const updatedStages: FabricationStage[] = [...job.stages]
  updatedStages[stageIndex] = {
    ...stage,
    status: "complete",
    started_at: stage.started_at ?? now,
    completed_at: now,
  }

  const nextSlug = getNextStage(params.current_stage)
  let nextCurrent: FabricationStageSlug | null = nextSlug
  let nextStatus: Job["status"] = "in_progress"

  if (nextSlug == null) {
    nextCurrent = null
    nextStatus = "complete"
  } else {
    const nextIndex = updatedStages.findIndex((s) => s.slug === nextSlug)
    if (nextIndex !== -1) {
      updatedStages[nextIndex] = {
        ...updatedStages[nextIndex]!,
        status: "in_progress",
        started_at: now,
      }
    }
  }

  const updatedJob: Job = {
    ...job,
    status: nextStatus,
    current_stage: nextCurrent,
    stages: updatedStages,
  }

  return updateJob(ctx.db, updatedJob)
}

function validateStageCompletion(
  job: Job,
  stageSlug: FabricationStageSlug,
): string | null {
  if (stageSlug === "clamp_pcb" && job.carrier.clamp_position <= 0) {
    return "PCB must be clamped before completing clamp_pcb"
  }

  if (stageSlug === "move_carrier_under_laser" && !job.carrier.has_been_moved) {
    return "Carrier must be moved before completing move_carrier_under_laser"
  }

  if (stageSlug === "level_carrier" && job.carrier.rotation_deg === 0) {
    return "Carrier must be leveled before completing level_carrier"
  }

  if (stageSlug === "flip_board" && job.carrier.orientation !== "bottom") {
    return "Carrier must be rotated to the bottom orientation before completing flip_board"
  }

  const burnStages = new Set([
    "top_deoxidation",
    "top_copper_fill",
    "bottom_deoxidation",
    "bottom_copper_fill",
  ])
  if (burnStages.has(stageSlug) && job.laser.last_burn_lbrn !== stageSlug) {
    return `Must burn '${stageSlug}' before completing ${stageSlug}`
  }

  if (stageSlug === "move_carrier_to_loading_position") {
    if (job.carrier.position.x !== 10) {
      return "Carrier must be moved to the loading position"
    }
  }

  if (stageSlug === "release_pcb" && job.carrier.clamp_position !== 0) {
    return "PCB must be unclamped before completing release_pcb"
  }

  return null
}

export const completeStep = advanceStage
