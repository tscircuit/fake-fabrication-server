import { completeStep } from "../../../../../../lib/jobs"
import {
  fabricationStepSlugSchema,
  jobSchema,
} from "../../../../../../lib/db/schema"
import { withRouteSpec } from "../../../../../../lib/middleware/with-winter-spec"
import { z } from "zod"

export default withRouteSpec({
  methods: ["POST"],
  routeParams: z.object({
    id: z.string(),
    step: fabricationStepSlugSchema,
  }),
  jsonResponse: jobSchema,
})((req, ctx) => {
  const result = completeStep(ctx.db, req.routeParams.id, req.routeParams.step)
  if (result instanceof Response) {
    return result
  }
  return ctx.json(result)
})
