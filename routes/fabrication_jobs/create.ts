import { z } from "zod"
import { createJob } from "../../lib/jobs"
import { jobResponseSchema } from "../../lib/db/schema"
import { withRouteSpec } from "../../lib/middleware/with-winter-spec"

export default withRouteSpec({
  methods: ["POST"],
  jsonBody: z.object({
    lbrn_files: z
      .object({
        top_alignment: z.string(),
        bottom_alignment: z.string(),
        top_deoxidation: z.string(),
        top_copper_fill: z.string(),
        bottom_deoxidation: z.string(),
        bottom_copper_fill: z.string(),
      })
      .strict(),
    metadata: z
      .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
      .optional(),
  }),
  jsonResponse: jobResponseSchema,
})(async (req, ctx) => {
  const result = await createJob(req.jsonBody, ctx)
  if (result instanceof Response) {
    return result
  }
  return ctx.json({ fabrication_job: result })
})
