import type { DbClient } from "./db/db-client"
import type {
  CreateJobRequest,
  FabricationStep,
  FabricationStepSlug,
  Job,
} from "./db/schema"
import { requireJob, updateJob } from "./job-store"
import { buildInitialSteps, getNextStep } from "./steps"
import { apiError, normalizeMetadata, nowSeconds } from "./utils"

const INITIAL_LASER_STATE = {
  alignment_on: false,
  alignment_lbrn: null,
  alignment_origin: null,
  position: { x: 0, y: 0 },
  last_burn_lbrn: null,
  last_burn_passes: null,
  last_burn_offset: null,
  last_burn_file_content: null,
  last_command_at: null,
} as const

const INITIAL_CARRIER_STATE = {
  position: { x: 0 },
  has_been_positioned: false,
  rotation_deg: 0,
  has_been_rotated: false,
  clamp_position: 0,
  last_command_at: null,
} as const

export async function createJob(
  db: DbClient,
  body: CreateJobRequest,
): Promise<Job | Response> {
  const id = db.createId("job")
  const steps = buildInitialSteps()
  const firstStep = steps[0]!

  steps[0] = {
    ...firstStep,
    status: "in_progress",
    started_at: nowSeconds(),
  }

  const job: Job = {
    id,
    object: "fabrication.job",
    created: nowSeconds(),
    status: "in_progress",
    current_step: firstStep.slug,
    steps,
    laser: { ...INITIAL_LASER_STATE },
    carrier: { ...INITIAL_CARRIER_STATE },
    lbrn_files: body.lbrn_files,
    top_alignment_offset: null,
    bottom_alignment_offset: null,
    metadata: normalizeMetadata(body.metadata),
  }

  return updateJob(db, job)
}

export function retrieveJob(db: DbClient, id: string): Job | Response {
  const job = requireJob(db, id)
  return job
}

export function completeStep(
  db: DbClient,
  jobId: string,
  stepSlug: FabricationStepSlug,
): Job | Response {
  const job = requireJob(db, jobId)
  if (job instanceof Response) return job

  const stepIndex = job.steps.findIndex((s) => s.slug === stepSlug)
  if (stepIndex === -1) {
    return apiError(`No such step '${stepSlug}' on job '${jobId}'`, 404)
  }

  const step = job.steps[stepIndex]!
  if (step.status === "complete") {
    return apiError(`Step '${stepSlug}' is already complete`, 409)
  }
  if (job.current_step !== stepSlug) {
    return apiError(
      `Step '${stepSlug}' is not the current step (current: '${job.current_step}')`,
      409,
    )
  }

  const preconditionError = validateStepCompletion(job, stepSlug)
  if (preconditionError != null) {
    return apiError(preconditionError, 409)
  }

  const now = nowSeconds()
  const updatedSteps: FabricationStep[] = [...job.steps]
  updatedSteps[stepIndex] = {
    ...step,
    status: "complete",
    started_at: step.started_at ?? now,
    completed_at: now,
  }

  const nextSlug = getNextStep(stepSlug)
  let nextCurrent: FabricationStepSlug | null = nextSlug
  let nextStatus: Job["status"] = "in_progress"

  if (nextSlug == null) {
    nextCurrent = null
    nextStatus = "complete"
  } else {
    const nextIndex = updatedSteps.findIndex((s) => s.slug === nextSlug)
    if (nextIndex !== -1) {
      updatedSteps[nextIndex] = {
        ...updatedSteps[nextIndex]!,
        status: "in_progress",
        started_at: now,
      }
    }
  }

  // The operator moves the laser into place with relative moves; the resulting
  // laser position is the saved alignment offset for that side.
  let top_alignment_offset = job.top_alignment_offset
  if (stepSlug === "top_alignment") {
    top_alignment_offset = getRelativeAlignmentOffset(job)
  }

  let bottom_alignment_offset = job.bottom_alignment_offset
  if (stepSlug === "bottom_alignment") {
    bottom_alignment_offset = getRelativeAlignmentOffset(job)
  }

  const updatedJob: Job = {
    ...job,
    status: nextStatus,
    current_step: nextCurrent,
    steps: updatedSteps,
    top_alignment_offset,
    bottom_alignment_offset,
    laser:
      stepSlug === "top_alignment" || stepSlug === "bottom_alignment"
        ? { ...job.laser, alignment_origin: null }
        : job.laser,
    carrier:
      stepSlug === "level_carrier"
        ? { ...job.carrier, has_been_rotated: false }
        : job.carrier,
  }

  return updateJob(db, updatedJob)
}

function getRelativeAlignmentOffset(job: Job): { x: number; y: number } {
  const origin = job.laser.alignment_origin
  if (origin == null) {
    throw new Error(
      "alignment_origin is null — validateStepCompletion should have prevented this",
    )
  }
  return {
    x: job.laser.position.x - origin.x,
    y: job.laser.position.y - origin.y,
  }
}

function validateStepCompletion(
  job: Job,
  stepSlug: FabricationStepSlug,
): string | null {
  if (stepSlug === "clamp_pcb" && job.carrier.clamp_position <= 0) {
    return "PCB must be clamped before completing clamp_pcb"
  }

  if (stepSlug === "position_carrier" && !job.carrier.has_been_positioned) {
    return "Carrier must be positioned before completing position_carrier"
  }

  if (stepSlug === "level_carrier" && !job.carrier.has_been_rotated) {
    return "Carrier must be leveled before completing level_carrier"
  }

  if (stepSlug === "flip_board" && !job.carrier.has_been_rotated) {
    return "Carrier must be rotated before completing flip_board"
  }

  if (
    (stepSlug === "top_alignment" || stepSlug === "bottom_alignment") &&
    job.laser.alignment_on
  ) {
    return "Laser alignment must be off before completing alignment"
  }

  if (
    (stepSlug === "top_alignment" || stepSlug === "bottom_alignment") &&
    job.laser.alignment_origin == null
  ) {
    return "Laser alignment must be started before completing alignment"
  }

  const burnStepLbrn: Partial<Record<FabricationStepSlug, string>> = {
    top_deoxidation: job.lbrn_files.top_deoxidation,
    top_copper_fill: job.lbrn_files.top_copper_fill,
    bottom_deoxidation: job.lbrn_files.bottom_deoxidation,
    bottom_copper_fill: job.lbrn_files.bottom_copper_fill,
  }
  const expectedBurnLbrn = burnStepLbrn[stepSlug]
  if (
    expectedBurnLbrn != null &&
    job.laser.last_burn_lbrn !== expectedBurnLbrn
  ) {
    return `Must burn '${expectedBurnLbrn}' before completing ${stepSlug}`
  }

  if (stepSlug === "release_pcb") {
    if (job.carrier.position.x !== 10) {
      return "Carrier must be moved to the release position"
    }
    if (job.carrier.rotation_deg !== 45) {
      return "Carrier must be rotated to the release angle"
    }
    if (job.carrier.clamp_position !== 0) {
      return "PCB must be unclamped before completing release_pcb"
    }
  }

  return null
}
