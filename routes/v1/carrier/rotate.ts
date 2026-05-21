import { rotateCarrier } from "../../../lib/carrier"
import {
  carrierResponseSchema,
  carrierRotateRequestSchema,
} from "../../../lib/db/schema"
import { withRouteSpec } from "../../../lib/middleware/with-winter-spec"

export default withRouteSpec({
  methods: ["POST"],
  jsonBody: carrierRotateRequestSchema,
  jsonResponse: carrierResponseSchema,
})((req, ctx) => {
  const result = rotateCarrier(ctx.db, req.jsonBody)
  if (result instanceof Response) {
    return result
  }
  return ctx.json(result)
})
