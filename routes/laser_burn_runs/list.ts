import { z } from "zod"
import { listLaserBurnRuns } from "../../lib/laser-burn-runs"
import { laserBurnRunsListResponseSchema } from "../../lib/db/schema"
import { withRouteSpec } from "../../lib/middleware/with-winter-spec"
import { apiError } from "../../lib/utils"

export default withRouteSpec({
  methods: ["GET", "POST"],
  queryParams: z.object({
    fabrication_job_id: z.string().optional(),
    limit: z.coerce.number().int().positive().optional(),
  }),
  jsonBody: z
    .object({
      fabrication_job_id: z.string(),
      limit: z.number().int().positive().optional(),
    })
    .optional(),
  jsonResponse: laserBurnRunsListResponseSchema,
})(async (req, ctx) => {
  const params = req.jsonBody ?? req.query
  if (params.fabrication_job_id == null) {
    return apiError("fabrication_job_id is required", 400)
  }
  const laser_burn_runs = listLaserBurnRuns(
    { ...params, fabrication_job_id: params.fabrication_job_id },
    ctx,
  )
  return ctx.json({
    laser_burn_runs,
  })
})
