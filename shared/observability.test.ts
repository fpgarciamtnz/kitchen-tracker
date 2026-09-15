import { describe, expect, it } from 'vitest'
import { clientLogFields, getFailureContext } from './observability'

describe('diagnostic logging', () => {
  it('keeps the response request ID without recording fetch bodies or credentials', () => {
    const cause = Object.assign(new Error('request with sensitive input'), {
      response: new Response(null, { status: 500, headers: { 'x-request-id': 'request-123' } }),
      data: { pin: 'secret-pin', name: 'private-name' },
      request: '/api/cleaning?token=secret'
    })
    const fields = getFailureContext(cause)
    expect(fields.status).toBe(500)
    expect(fields.requestId).toBe('request-123')
    expect(fields.error.message).toBe('Request failed')
    expect(JSON.stringify(fields)).not.toMatch(/secret-pin|private-name|token=secret|sensitive input/)
  })

  it('accepts only bounded diagnostic fields from the public client endpoint', () => {
    const fields = clientLogFields({
      source: 'server', action: 'cleaning_load_failed', path: '/deep?pin=secret',
      pin: 'secret', by: 'Private Name', body: { cookie: 'session' },
      error: { message: 'x'.repeat(500), stack: 'y'.repeat(3000), data: { pin: 'secret' } },
      requestId: 'request-123', status: 500
    })
    expect(fields.source).toBe('client')
    expect(fields.path).toBe('/deep')
    expect(fields.requestId).toBe('request-123')
    expect(fields.error?.message).toHaveLength(300)
    expect(fields.error?.stack).toHaveLength(2000)
    expect(JSON.stringify(fields)).not.toMatch(/secret|Private Name|session/)
  })
})
