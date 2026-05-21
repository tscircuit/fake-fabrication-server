import { setLaserAlignment } from "../../../lib/laser"
import {
  laserAlignmentRequestSchema,
  laserResponseSchema,
} from "../../../lib/db/schema"
import { withRouteSpec } from "../../../lib/middleware/with-winter-spec"

export default withRouteSpec({
  methods: ["POST"],
  jsonBody: laserAlignmentRequestSchema,
  jsonResponse: laserResponseSchema,
})((req, ctx) => {
  const result = setLaserAlignment(ctx.db, req.jsonBody)
  if (result instanceof Response) {
    return result
  }
  return ctx.json(result)
})
