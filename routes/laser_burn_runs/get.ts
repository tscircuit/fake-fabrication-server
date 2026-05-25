import { z } from "zod"
import { retrieveLaserBurnRun } from "../../lib/laser-burn-runs"
import { laserBurnRunResponseSchema } from "../../lib/db/schema"
import { withRouteSpec } from "../../lib/middleware/with-winter-spec"
import { apiError } from "../../lib/utils"

export default withRouteSpec({
  methods: ["GET", "POST"],
  queryParams: z.object({
    laser_burn_run_id: z.string().optional(),
  }),
  jsonBody: z
    .object({
      laser_burn_run_id: z.string(),
    })
    .optional(),
  jsonResponse: laserBurnRunResponseSchema,
})(async (req, ctx) => {
  const params = req.jsonBody ?? req.query
  if (params.laser_burn_run_id == null) {
    return apiError("laser_burn_run_id is required", 400)
  }
  const result = retrieveLaserBurnRun(
    { laser_burn_run_id: params.laser_burn_run_id },
    ctx,
  )
  if (result instanceof Response) {
    return result
  }
  return ctx.json({ laser_burn_run: result })
})
