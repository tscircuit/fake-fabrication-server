import { z } from "zod"
import { rotateCarrier } from "../../lib/carrier"
import { carrierStateSchema } from "../../lib/db/schema"
import { withRouteSpec } from "../../lib/middleware/with-winter-spec"

export default withRouteSpec({
  methods: ["POST"],
  jsonBody: z
    .object({
      fabrication_job_id: z.string(),
      delta_deg: z.number().optional(),
      angle_deg: z.number().optional(),
    })
    .strict()
    .refine((body) => (body.delta_deg == null) !== (body.angle_deg == null), {
      message: "Provide exactly one of delta_deg or angle_deg",
    }),
  jsonResponse: z.object({
    ok: z.literal(true),
    fabrication_job_id: z.string(),
    carrier: carrierStateSchema,
  }),
})(async (req, ctx) => {
  const result = rotateCarrier(req.jsonBody, ctx)
  if (result instanceof Response) {
    return result
  }
  return ctx.json(result)
})
