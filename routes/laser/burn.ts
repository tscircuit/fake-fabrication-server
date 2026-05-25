import { z } from "zod"
import { burnLaser } from "../../lib/laser"
import { laserResponseSchema } from "../../lib/db/schema"
import { withRouteSpec } from "../../lib/middleware/with-winter-spec"

export default withRouteSpec({
  methods: ["POST"],
  jsonBody: z
    .object({
      fabrication_job_id: z.string(),
      lbrn_vfs_path: z.string(),
      passes: z.number().int().positive().optional(),
    })
    .strict(),
  jsonResponse: laserResponseSchema,
})(async (req, ctx) => {
  const result = burnLaser(req.jsonBody, ctx)
  if (result instanceof Response) {
    return result
  }
  return ctx.json(result)
})
