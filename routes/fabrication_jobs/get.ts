import { z } from "zod"
import { retrieveJob } from "../../lib/jobs"
import { jobResponseSchema } from "../../lib/db/schema"
import { withRouteSpec } from "../../lib/middleware/with-winter-spec"
import { apiError } from "../../lib/utils"

export default withRouteSpec({
  methods: ["GET", "POST"],
  queryParams: z.object({
    fabrication_job_id: z.string().optional(),
  }),
  jsonBody: z
    .object({
      fabrication_job_id: z.string(),
    })
    .optional(),
  jsonResponse: jobResponseSchema,
})(async (req, ctx) => {
  const params = req.jsonBody ?? req.query
  if (params.fabrication_job_id == null) {
    return apiError("fabrication_job_id is required", 400)
  }
  const result = retrieveJob(
    { fabrication_job_id: params.fabrication_job_id },
    ctx,
  )
  if (result instanceof Response) {
    return result
  }
  return ctx.json({ fabrication_job: result })
})
