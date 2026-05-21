import { z } from "zod"
import { completeStep } from "../../../lib/jobs"
import { jobSchema } from "../../../lib/db/schema"
import { withRouteSpec } from "../../../lib/middleware/with-winter-spec"

export default withRouteSpec({
  methods: ["POST"],
  jsonBody: z.object({
    fabrication_job_id: z.string(),
    step: z.enum([
      "load_pcb",
      "clamp_pcb",
      "position_carrier",
      "level_carrier",
      "top_alignment",
      "top_deoxidation",
      "top_copper_fill",
      "flip_board",
      "bottom_alignment",
      "bottom_deoxidation",
      "bottom_copper_fill",
      "release_pcb",
      "complete",
    ]),
  }),
  jsonResponse: jobSchema,
})(async (req, ctx) => {
  const result = completeStep(req.jsonBody, ctx)
  if (result instanceof Response) {
    return result
  }
  return ctx.json(result)
})
