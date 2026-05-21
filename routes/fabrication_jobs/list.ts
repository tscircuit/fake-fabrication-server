import { z } from "zod"
import { listJobs } from "../../lib/jobs"
import { jobsListResponseSchema } from "../../lib/db/schema"
import { withRouteSpec } from "../../lib/middleware/with-winter-spec"

export default withRouteSpec({
  methods: ["GET", "POST"],
  queryParams: z.object({
    limit: z.coerce.number().int().positive().optional(),
  }),
  jsonBody: z
    .object({
      limit: z.number().int().positive().optional(),
    })
    .optional(),
  jsonResponse: jobsListResponseSchema,
})(async (req, ctx) => {
  const params = req.jsonBody ?? req.query
  const fabrication_jobs = listJobs(params, ctx)
  return ctx.json({
    fabrication_jobs,
  })
})
