import type { MaybeRefOrGetter } from 'vue'
import { encodePackageName } from '#shared/utils/npm'

export function usePackageMetaState() {
  return useState<Record<string, PackageMetaResponse>>('package-meta-cache', () => ({}))
}

export function fetchPackageMeta(name: string): Promise<PackageMetaResponse | null> {
  const cache = usePackageMetaState()
  if (cache.value[name]) {
    return Promise.resolve(cache.value[name]!)
  }

  return $fetch<PackageMetaResponse>(`/api/registry/package-meta/${encodePackageName(name)}`)
    .then(data => {
      cache.value = { ...cache.value, [name]: data }
      return data
    })
    .catch(() => null)
}

export function usePackageMeta(packageName: MaybeRefOrGetter<string | undefined>) {
  const cache = usePackageMetaState()
  const name = computed(() => toValue(packageName))

  const meta = computed(() => (name.value ? (cache.value[name.value] ?? null) : null))

  watch(
    name,
    pkgName => {
      if (!pkgName || cache.value[pkgName]) return
      fetchPackageMeta(pkgName).catch(() => {})
    },
    { immediate: true },
  )

  return { data: meta }
}
