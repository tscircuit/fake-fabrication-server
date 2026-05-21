import { createWithWinterSpec } from "winterspec"
import { withDb } from "./with-db"
import { withFabricationCors } from "./with-cors"
import { withFabricationErrors } from "./with-errors"

export const withRouteSpec = createWithWinterSpec({
  openapi: {
    apiName: "fake-fabrication-server",
    productionServerUrl: "https://api.fabrication.test",
  },
  authMiddleware: {},
  beforeAuthMiddleware: [],
  afterAuthMiddleware: [
    withFabricationCors,
    withFabricationErrors,
    withDb,
  ],
})
