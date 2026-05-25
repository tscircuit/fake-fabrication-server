import { z } from "zod"
import { releaseCarrier } from "../../lib/carrier"
import { carrierResponseSchema } from "../../lib/db/schema"
import { withRouteSpec } from "../../lib/middleware/with-winter-spec"

export default withRouteSpec({
  methods: ["POST"],
  jsonBody: z.object({
    fabrication_job_id: z.string(),
  }),
  jsonResponse: carrierResponseSchema,
})(async (req, ctx) => {
  const result = releaseCarrier(req.jsonBody, ctx)
  if (result instanceof Response) {
    return result
  }
  return ctx.json(result)
})
