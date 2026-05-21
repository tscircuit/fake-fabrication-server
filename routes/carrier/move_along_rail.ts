import { z } from "zod"
import { moveCarrierAlongRail } from "../../lib/carrier"
import { carrierStateSchema } from "../../lib/db/schema"
import { withRouteSpec } from "../../lib/middleware/with-winter-spec"

export default withRouteSpec({
  methods: ["POST"],
  jsonBody: z
    .object({
      fabrication_job_id: z.string(),
      x: z.number().optional(),
      dx: z.number().optional(),
    })
    .strict()
    .refine((body) => (body.x == null) !== (body.dx == null), {
      message: "Provide exactly one of x or dx",
    }),
  jsonResponse: z.object({
    ok: z.literal(true),
    fabrication_job_id: z.string(),
    carrier: carrierStateSchema,
  }),
})(async (req, ctx) => {
  const result = moveCarrierAlongRail(req.jsonBody, ctx)
  if (result instanceof Response) {
    return result
  }
  return ctx.json(result)
})
