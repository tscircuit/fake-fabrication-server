export function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers()
  headers.set("content-type", "application/json; charset=utf-8")

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  })
}

export function apiError(message: string, status: number): Response {
  let type = "api_error"
  if (status >= 400 && status < 500) {
    type = "invalid_request_error"
  }

  return jsonResponse(
    {
      error: {
        type,
        message,
      },
    },
    { status },
  )
}

export function corsPreflightResponse(request: Request): Response {
  return withCors(new Response(null, { status: 204 }), request)
}

export function withCors(response: Response, request: Request): Response {
  const headers = new Headers(response.headers)
  const requestedHeaders = request.headers.get("access-control-request-headers")

  headers.set("access-control-allow-origin", "*")
  headers.set("access-control-allow-methods", "GET, POST, OPTIONS")
  headers.set(
    "access-control-allow-headers",
    requestedHeaders ?? "authorization, content-type",
  )
  headers.set("access-control-max-age", "86400")

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value)
}

export function normalizeMetadata(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, String(entry)]),
  )
}

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}
