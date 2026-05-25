import { withRouteSpec } from "../lib/middleware/with-winter-spec"
import { z } from "zod"

export default withRouteSpec({
  methods: ["GET"],
  jsonResponse: z.object({}),
})((req, ctx) => {
  return ctx.json({})
})
