import { clampCarrier } from "../../../lib/carrier"
import {
  carrierClampRequestSchema,
  carrierResponseSchema,
} from "../../../lib/db/schema"
import { withRouteSpec } from "../../../lib/middleware/with-winter-spec"

export default withRouteSpec({
  methods: ["POST"],
  jsonBody: carrierClampRequestSchema,
  jsonResponse: carrierResponseSchema,
})((req, ctx) => {
  const result = clampCarrier(ctx.db, req.jsonBody)
  if (result instanceof Response) {
    return result
  }
  return ctx.json(result)
})
