import type {
  CarrierClampRequest,
  CarrierMoveRequest,
  CarrierResponse,
  CarrierRotateRequest,
  CarrierRotateToOrientationRequest,
  CarrierState,
} from "./db/schema"
import type { AppContext } from "./types"
import { requireJob, updateJob } from "./job-store"
import { nowSeconds } from "./utils"

function normalizeAngle(deg: number): number {
  const mod = deg % 360
  if (mod < 0) {
    return mod + 360
  }
  return mod
}

export function moveCarrierAlongRail(
  body: CarrierMoveRequest,
  ctx: AppContext,
): CarrierResponse | Response {
  const job = requireJob(ctx.db, body.fabrication_job_id)
  if (job instanceof Response) return job

  const carrier: CarrierState = {
    ...job.carrier,
    position: { x: body.x },
    has_been_moved: true,
    last_command_at: nowSeconds(),
  }
  const updated = updateJob(ctx.db, { ...job, carrier })
  return {
    fabrication_job_id: updated.id,
    carrier: updated.carrier,
  }
}

export function rotateCarrier(
  body: CarrierRotateRequest,
  ctx: AppContext,
): CarrierResponse | Response {
  const job = requireJob(ctx.db, body.fabrication_job_id)
  if (job instanceof Response) return job

  const carrier: CarrierState = {
    ...job.carrier,
    rotation_deg: normalizeAngle(body.angle_deg),
    last_command_at: nowSeconds(),
  }
  const updated = updateJob(ctx.db, { ...job, carrier })
  return {
    fabrication_job_id: updated.id,
    carrier: updated.carrier,
  }
}

export function rotateCarrierToOrientation(
  body: CarrierRotateToOrientationRequest,
  ctx: AppContext,
): CarrierResponse | Response {
  const job = requireJob(ctx.db, body.fabrication_job_id)
  if (job instanceof Response) return job

  const orientationAngles = {
    top: 0,
    bottom: 180,
    pcb_insertion: 0,
    pcb_drop: 45,
  } satisfies Record<CarrierRotateToOrientationRequest["orientation"], number>

  const carrier: CarrierState = {
    ...job.carrier,
    orientation: body.orientation,
    rotation_deg: orientationAngles[body.orientation],
    last_command_at: nowSeconds(),
  }
  const updated = updateJob(ctx.db, { ...job, carrier })
  return {
    fabrication_job_id: updated.id,
    carrier: updated.carrier,
  }
}

export function clampCarrier(
  body: CarrierClampRequest,
  ctx: AppContext,
): CarrierResponse | Response {
  const job = requireJob(ctx.db, body.fabrication_job_id)
  if (job instanceof Response) return job

  const carrier: CarrierState = {
    ...job.carrier,
    clamp_position: 1,
    last_command_at: nowSeconds(),
  }
  const updated = updateJob(ctx.db, { ...job, carrier })
  return {
    fabrication_job_id: updated.id,
    carrier: updated.carrier,
  }
}

export function releaseCarrier(
  body: { fabrication_job_id: string },
  ctx: AppContext,
): CarrierResponse | Response {
  const job = requireJob(ctx.db, body.fabrication_job_id)
  if (job instanceof Response) return job

  const carrier: CarrierState = {
    ...job.carrier,
    clamp_position: 0,
    last_command_at: nowSeconds(),
  }
  const updated = updateJob(ctx.db, { ...job, carrier })
  return {
    fabrication_job_id: updated.id,
    carrier: updated.carrier,
  }
}
