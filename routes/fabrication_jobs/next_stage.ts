import { z } from "zod"
import { advanceStage } from "../../lib/jobs"
import { fabricationStageSlugSchema, jobResponseSchema } from "../../lib/db/schema"
import { withRouteSpec } from "../../lib/middleware/with-winter-spec"

export default withRouteSpec({
  methods: ["POST"],
  jsonBody: z.object({
    fabrication_job_id: z.string(),
    current_stage: fabricationStageSlugSchema,
  }),
  jsonResponse: jobResponseSchema,
})(async (req, ctx) => {
  const result = advanceStage(req.jsonBody, ctx)
  if (result instanceof Response) {
    return result
  }
  return ctx.json({ fabrication_job: result })
})
