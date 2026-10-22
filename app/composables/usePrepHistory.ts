import { daysBetween, localDate } from '#shared/prep-history'
import type { PrepHistory } from '#shared/prep-history'

/** When each prep item and product was last on a list, leaving out the list on screen. */
export function usePrepHistory(excludeListId: MaybeRefOrGetter<string | undefined>) {
  const { t } = useI18n()
  const { data } = useFetch<PrepHistory>('/api/prep/history', {
    query: { exclude: computed(() => toValue(excludeListId) ?? '') },
    server: false,
    lazy: true,
    default: () => ({ prep: {}, order: {} }),
  })
  const days = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  function label(date: string | undefined) {
    return date
      ? t('history.last', { when: days.format(daysBetween(localDate(), date), 'day') })
      : ''
  }
  return {
    lastPrep: (itemId: string) => label(data.value.prep[itemId]),
    lastOrder: (key: string) => label(data.value.order[key]),
  }
}
