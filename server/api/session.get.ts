import { hasSession } from '../utils/session'
export default defineEventHandler(async event => ({ authenticated: await hasSession(event) }))
