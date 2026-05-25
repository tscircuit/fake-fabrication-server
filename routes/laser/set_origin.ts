import { z } from "zod"
import { setLaserOrigin } from "../../lib/laser"
import { laserResponseSchema } from "../../lib/db/schema"
import { withRouteSpec } from "../../lib/middleware/with-winter-spec"

export default withRouteSpec({
  methods: ["POST"],
  jsonBody: z
    .object({
      fabrication_job_id: z.string(),
      origin: z.object({
        x: z.number(),
        y: z.number(),
      }),
    })
    .strict(),
  jsonResponse: laserResponseSchema,
})(async (req, ctx) => {
  const result = setLaserOrigin(req.jsonBody, ctx)
  if (result instanceof Response) {
    return result
  }
  return ctx.json(result)
})
