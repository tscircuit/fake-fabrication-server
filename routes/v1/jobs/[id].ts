import { retrieveJob } from "../../../lib/jobs"
import { jobSchema } from "../../../lib/db/schema"
import { withRouteSpec } from "../../../lib/middleware/with-winter-spec"
import { z } from "zod"

export default withRouteSpec({
  methods: ["GET"],
  routeParams: z.object({
    id: z.string(),
  }),
  jsonResponse: jobSchema,
})((req, ctx) => {
  const result = retrieveJob(ctx.db, req.routeParams.id)
  if (result instanceof Response) {
    return result
  }
  return ctx.json(result)
})
