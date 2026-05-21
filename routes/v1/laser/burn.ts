import { burnLaser } from "../../../lib/laser"
import {
  laserBurnRequestSchema,
  laserResponseSchema,
} from "../../../lib/db/schema"
import { withRouteSpec } from "../../../lib/middleware/with-winter-spec"

export default withRouteSpec({
  methods: ["POST"],
  jsonBody: laserBurnRequestSchema,
  jsonResponse: laserResponseSchema,
})(async (req, ctx) => {
  const result = await burnLaser(ctx.db, req.jsonBody)
  if (result instanceof Response) {
    return result
  }
  return ctx.json(result)
})
