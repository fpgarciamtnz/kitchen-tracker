function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

// Keep diagnostics, not ofetch request/response bodies or user-supplied input.
export function getFailureContext(cause: unknown) {
  const record = isRecord(cause) ? cause : {}
  const response = record.response instanceof Response ? record.response : undefined
  const status = response?.status ?? record.statusCode ?? record.status
  return {
    status: typeof status === 'number' ? status : undefined,
    requestId: response?.headers.get('x-request-id') ?? response?.headers.get('cf-ray') ?? undefined,
    error: {
      name: cause instanceof Error ? cause.name : 'Error',
      message: response ? 'Request failed' : cause instanceof Error ? cause.message.slice(0, 300) : 'Unexpected failure',
      stack: cause instanceof Error ? cause.stack?.split('\n').slice(1, 9).join('\n').replace(/\?[^\s)]+/g, '').slice(0, 2000) : undefined
    }
  }
}

// Browser events are untrusted. Do not forward arbitrary fields to server logs.
export function clientLogFields(event: Record<string, unknown>) {
  const error = isRecord(event.error) ? event.error : {}
  const text = (value: unknown, limit: number) => typeof value === 'string' ? value.slice(0, limit) : undefined
  return {
    source: 'client',
    action: text(event.action, 80),
    path: text(event.path, 200)?.split(/[?#]/)[0],
    endpoint: text(event.endpoint, 100)?.split(/[?#]/)[0],
    requestId: text(event.requestId, 100),
    status: typeof event.status === 'number' ? event.status : undefined,
    taskCount: typeof event.taskCount === 'number' ? event.taskCount : undefined,
    error: typeof error.message === 'string' ? {
      name: text(error.name, 80), message: text(error.message, 300), stack: text(error.stack, 2000)
    } : undefined
  }
}
