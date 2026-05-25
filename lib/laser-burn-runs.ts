import type { LaserBurnRun } from "./db/schema"
import type { AppContext } from "./types"
import { apiError } from "./utils"

export function listLaserBurnRuns(
  params: { fabrication_job_id: string; limit?: number; page_cursor?: string },
  ctx: AppContext,
): LaserBurnRun[] {
  const runs = ctx.db.listLaserBurnRuns(params.fabrication_job_id)
  return params.limit == null ? runs : runs.slice(0, params.limit)
}

export function retrieveLaserBurnRun(
  params: { laser_burn_run_id: string },
  ctx: AppContext,
): LaserBurnRun | Response {
  const run = ctx.db.getLaserBurnRun(params.laser_burn_run_id)
  if (run == null) {
    return apiError(
      `No such laser_burn_run: '${params.laser_burn_run_id}'`,
      404,
    )
  }
  return run
}
