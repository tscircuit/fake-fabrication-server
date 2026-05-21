import type { DbClient } from "./db/db-client"
import type {
  Job,
  LaserAlignmentRequest,
  LaserBurnRequest,
  LaserMoveRequest,
  LaserResponse,
  LaserState,
} from "./db/schema"
import { requireJob, updateJob } from "./job-store"
import { apiError, nowSeconds } from "./utils"

export function setLaserAlignment(
  db: DbClient,
  body: LaserAlignmentRequest,
): LaserResponse | Response {
  const job = requireJob(db, body.job_id)
  if (job instanceof Response) return job

  let alignment_lbrn: string | null = null
  if (body.on) {
    alignment_lbrn = body.lbrn
  }

  let alignment_origin = job.laser.alignment_origin
  if (body.on) {
    alignment_origin = { ...job.laser.position }
  }

  const laser: LaserState = {
    ...job.laser,
    alignment_on: body.on,
    alignment_lbrn,
    alignment_origin,
    last_command_at: nowSeconds(),
  }
  const updated = updateJob(db, { ...job, laser })
  return { ok: true, job_id: updated.id, laser: updated.laser }
}

export function moveLaser(
  db: DbClient,
  body: LaserMoveRequest,
): LaserResponse | Response {
  const job = requireJob(db, body.job_id)
  if (job instanceof Response) return job

  const laser: LaserState = {
    ...job.laser,
    position: {
      x: job.laser.position.x + body.dx,
      y: job.laser.position.y + body.dy,
    },
    last_command_at: nowSeconds(),
  }
  const updated = updateJob(db, { ...job, laser })
  return { ok: true, job_id: updated.id, laser: updated.laser }
}

export async function burnLaser(
  db: DbClient,
  body: LaserBurnRequest,
): Promise<LaserResponse | Response> {
  const job = requireJob(db, body.job_id)
  if (job instanceof Response) return job

  const expectedLbrn = getExpectedBurnLbrn(job)
  if (expectedLbrn instanceof Response) {
    return expectedLbrn
  }
  if (body.lbrn !== expectedLbrn) {
    return apiError(
      `Expected burn lbrn '${expectedLbrn}' for step '${job.current_step}'`,
      409,
    )
  }

  let offset = job.top_alignment_offset
  if (
    job.current_step === "bottom_deoxidation" ||
    job.current_step === "bottom_copper_fill"
  ) {
    offset = job.bottom_alignment_offset
  }
  if (offset == null) {
    return apiError(
      `No saved alignment offset for step '${job.current_step}'`,
      409,
    )
  }

  const last_burn_file_content = await fetchLbrnContent(body.lbrn)

  const laser: LaserState = {
    ...job.laser,
    last_burn_lbrn: body.lbrn,
    last_burn_passes: body.passes ?? 1,
    last_burn_offset: offset,
    last_burn_file_content,
    last_command_at: nowSeconds(),
  }
  const updated = updateJob(db, { ...job, laser })
  return { ok: true, job_id: updated.id, laser: updated.laser }
}

const FAKE_LBRN_CONTENT = `<?xml version="1.0" encoding="UTF-8"?>
<LightBurnProject AppVersion="1.7.00" FormatVersion="1" MaterialHeight="0" MirrorX="False" MirrorY="False">
</LightBurnProject>`

async function fetchLbrnContent(url: string): Promise<string | null> {
  if (url.includes("fake-r2.tscircuit.com")) {
    return FAKE_LBRN_CONTENT
  }
  try {
    const res = await fetch(url)
    return res.ok ? await res.text() : null
  } catch {
    return null
  }
}

function getExpectedBurnLbrn(job: Job): string | Response {
  if (job.current_step === "top_deoxidation") {
    return job.lbrn_files.top_deoxidation
  }
  if (job.current_step === "top_copper_fill") {
    return job.lbrn_files.top_copper_fill
  }
  if (job.current_step === "bottom_deoxidation") {
    return job.lbrn_files.bottom_deoxidation
  }
  if (job.current_step === "bottom_copper_fill") {
    return job.lbrn_files.bottom_copper_fill
  }

  return apiError(`Cannot burn during step '${job.current_step}'`, 409)
}
