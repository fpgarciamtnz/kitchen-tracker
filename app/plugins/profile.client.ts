import { useStorage } from '@vueuse/core'

export default defineNuxtPlugin(() => {
  const storedName = useStorage('kitchen-tracker-name', '')
  const storedTrust = useStorage('kitchen-tracker-authenticated', false)
  const { name } = useProfile()
  const { authenticated } = useSession()

  name.value = storedName.value
  watch(name, value => { storedName.value = value }, { flush: 'sync' })
  watch(authenticated, value => { storedTrust.value = value }, { immediate: true })
})
