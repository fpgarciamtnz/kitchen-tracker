export default defineEventHandler((event) => {
  const logger = useLogger(event)
  const requestId = logger.getContext().requestId
  if (typeof requestId === 'string') setResponseHeader(event, 'x-request-id', requestId)
  logger.set({ source: 'server', path: event.path.split('?')[0] })
})
