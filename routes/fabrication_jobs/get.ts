import { z } from "zod"
import { retrieveJob } from "../../lib/jobs"
import { jobSchema } from "../../lib/db/schema"
import { withRouteSpec } from "../../lib/middleware/with-winter-spec"

export default withRouteSpec({
  methods: ["GET"],
  queryParams: z.object({
    fabrication_job_id: z.string(),
  }),
  jsonResponse: jobSchema,
})(async (req, ctx) => {
  const result = retrieveJob(req.query, ctx)
  if (result instanceof Response) {
    return result
  }
  return ctx.json(result)
})
