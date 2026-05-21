import { z } from "zod"
import { setLaserAlignment } from "../../lib/laser"
import { laserStateSchema } from "../../lib/db/schema"
import { withRouteSpec } from "../../lib/middleware/with-winter-spec"

export default withRouteSpec({
  methods: ["POST"],
  jsonBody: z
    .object({
      fabrication_job_id: z.string(),
      lbrn: z.string(),
      on: z.boolean(),
    })
    .strict(),
  jsonResponse: z.object({
    ok: z.literal(true),
    fabrication_job_id: z.string(),
    laser: laserStateSchema,
  }),
})(async (req, ctx) => {
  const result = setLaserAlignment(req.jsonBody, ctx)
  if (result instanceof Response) {
    return result
  }
  return ctx.json(result)
})
