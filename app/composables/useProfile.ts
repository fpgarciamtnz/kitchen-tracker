export function useProfile() {
  const nuxtApp = useNuxtApp()
  const name = useState<string>('profile-name', () => '')

  function save(nextName: string) {
    const normalized = nextName.trim()
    if (normalized.length < 2 || normalized.length > 60) {
      throw new Error(nuxtApp.$i18n.t('profile.invalid'))
    }
    name.value = normalized
  }

  return { name, save }
}
