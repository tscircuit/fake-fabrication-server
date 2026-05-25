import type { Middleware } from "winterspec"
import { apiError } from "../utils"

export const withFabricationErrors: Middleware = async (req, ctx, next) => {
  try {
    return await next(req, ctx)
  } catch (error) {
    if (isWinterSpecHttpException(error)) {
      if (error.status === 405) {
        return apiError("Unknown route", 404)
      }

      return apiError(error.message, error.status)
    }

    throw error
  }
}

function isWinterSpecHttpException(
  error: unknown,
): error is { message: string; status: number; _isHttpException: true } {
  return (
    typeof error === "object" &&
    error != null &&
    "_isHttpException" in error &&
    "message" in error &&
    "status" in error &&
    typeof error.message === "string" &&
    typeof error.status === "number"
  )
}
