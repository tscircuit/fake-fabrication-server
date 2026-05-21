import { moveCarrier } from "../../../lib/carrier"
import {
  carrierMoveRequestSchema,
  carrierResponseSchema,
} from "../../../lib/db/schema"
import { withRouteSpec } from "../../../lib/middleware/with-winter-spec"

export default withRouteSpec({
  methods: ["POST"],
  jsonBody: carrierMoveRequestSchema,
  jsonResponse: carrierResponseSchema,
})((req, ctx) => {
  const result = moveCarrier(ctx.db, req.jsonBody)
  if (result instanceof Response) {
    return result
  }
  return ctx.json(result)
})
