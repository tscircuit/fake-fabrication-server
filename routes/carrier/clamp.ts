import { z } from "zod"
import { clampCarrier } from "../../lib/carrier"
import { carrierStateSchema } from "../../lib/db/schema"
import { withRouteSpec } from "../../lib/middleware/with-winter-spec"

export default withRouteSpec({
  methods: ["POST"],
  jsonBody: z.object({
    fabrication_job_id: z.string(),
    delta: z.number(),
  }),
  jsonResponse: z.object({
    ok: z.literal(true),
    fabrication_job_id: z.string(),
    carrier: carrierStateSchema,
  }),
})(async (req, ctx) => {
  const result = clampCarrier(req.jsonBody, ctx)
  if (result instanceof Response) {
    return result
  }
  return ctx.json(result)
})
