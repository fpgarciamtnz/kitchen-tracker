export default defineNuxtRouteMiddleware(async (to) => {
  const session = useSession()
  if (to.path === '/pin') return
  if (session.loading.value) await session.refresh()
  if (!session.authenticated.value) return navigateTo('/pin')

  if (import.meta.client && to.path !== '/perfil') {
    const { name } = useProfile()
    if (name.value.trim().length < 2) return navigateTo('/perfil?setup=1')
  }
})
