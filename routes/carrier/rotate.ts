import { z } from "zod"
import { rotateCarrier } from "../../lib/carrier"
import { carrierResponseSchema } from "../../lib/db/schema"
import { withRouteSpec } from "../../lib/middleware/with-winter-spec"

export default withRouteSpec({
  methods: ["POST"],
  jsonBody: z
    .object({
      fabrication_job_id: z.string(),
      angle_deg: z.number(),
    })
    .strict(),
  jsonResponse: carrierResponseSchema,
})(async (req, ctx) => {
  const result = rotateCarrier(req.jsonBody, ctx)
  if (result instanceof Response) {
    return result
  }
  return ctx.json(result)
})
