import { createJob } from "../../lib/jobs"
import { createJobRequestSchema, jobSchema } from "../../lib/db/schema"
import { withRouteSpec } from "../../lib/middleware/with-winter-spec"

export default withRouteSpec({
  methods: ["POST"],
  jsonBody: createJobRequestSchema,
  jsonResponse: jobSchema,
})(async (req, ctx) => {
  const result = await createJob(ctx.db, req.jsonBody)
  if (result instanceof Response) {
    return result
  }
  return ctx.json(result)
})
