import type { DbClient } from "./db/db-client"
import type {
  CarrierClampRequest,
  CarrierMoveRequest,
  CarrierResponse,
  CarrierRotateRequest,
  CarrierState,
} from "./db/schema"
import { requireJob, updateJob } from "./job-store"
import { apiError, nowSeconds } from "./utils"

function normalizeAngle(deg: number): number {
  const mod = deg % 360
  if (mod < 0) {
    return mod + 360
  }
  return mod
}

export function moveCarrier(
  db: DbClient,
  body: CarrierMoveRequest,
): CarrierResponse | Response {
  const job = requireJob(db, body.job_id)
  if (job instanceof Response) return job

  let x = body.x
  if (x == null) {
    x = job.carrier.position.x + (body.dx ?? 0)
  }

  const carrier: CarrierState = {
    ...job.carrier,
    position: { x },
    has_been_positioned: true,
    last_command_at: nowSeconds(),
  }
  const updated = updateJob(db, { ...job, carrier })
  return { ok: true, job_id: updated.id, carrier: updated.carrier }
}

export function rotateCarrier(
  db: DbClient,
  body: CarrierRotateRequest,
): CarrierResponse | Response {
  const job = requireJob(db, body.job_id)
  if (job instanceof Response) return job

  let rotation_deg = body.angle_deg
  if (rotation_deg == null) {
    rotation_deg = job.carrier.rotation_deg + (body.delta_deg ?? 0)
  }

  const carrier: CarrierState = {
    ...job.carrier,
    rotation_deg: normalizeAngle(rotation_deg),
    has_been_rotated: true,
    last_command_at: nowSeconds(),
  }
  const updated = updateJob(db, { ...job, carrier })
  return { ok: true, job_id: updated.id, carrier: updated.carrier }
}

export function clampCarrier(
  db: DbClient,
  body: CarrierClampRequest,
): CarrierResponse | Response {
  const job = requireJob(db, body.job_id)
  if (job instanceof Response) return job

  const clamp_position = job.carrier.clamp_position + body.delta
  if (clamp_position < 0) {
    return apiError("Clamp position cannot be negative", 409)
  }

  const carrier: CarrierState = {
    ...job.carrier,
    clamp_position,
    last_command_at: nowSeconds(),
  }
  const updated = updateJob(db, { ...job, carrier })
  return { ok: true, job_id: updated.id, carrier: updated.carrier }
}
