export function useProfile() {
  const name = useState<string>('profile-name', () => '')

  function save(nextName: string) {
    const normalized = nextName.trim()
    if (normalized.length < 2 || normalized.length > 60) {
      throw new Error('Escribe un nombre de entre 2 y 60 caracteres.')
    }
    name.value = normalized
  }

  return { name, save }
}
