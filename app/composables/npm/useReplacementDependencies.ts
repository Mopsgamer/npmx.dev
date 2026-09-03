import type { ModuleReplacement, ModuleReplacementMapping } from 'module-replacements'
import type { DependencySpec } from '~/utils/npm/package-dependency-sections'

async function fetchReplacements(
  deps: Record<string, DependencySpec>,
): Promise<Record<string, ModuleReplacement>> {
  const entries = Object.entries(deps)
  if (entries.length === 0) return {}

  const uniquePackageNames = Array.from(new Set(entries.map(([, spec]) => spec.name)))

  if (uniquePackageNames.length === 1) {
    const packageName = uniquePackageNames[0]!
    try {
      const response = await $fetch<{
        mapping: ModuleReplacementMapping
        replacement: ModuleReplacement
      } | null>(`/api/replacements/${encodeURIComponent(packageName)}`)

      if (!response?.replacement) return {}
      const map: Record<string, ModuleReplacement> = {}
      for (const [key, spec] of entries) {
        if (spec.name === packageName) {
          map[key] = response.replacement
        }
      }
      return map
    } catch {
      return {}
    }
  }

  try {
    const query = uniquePackageNames.map(encodeURIComponent).join(',')
    const response = await $fetch<
      Record<string, { mapping: ModuleReplacementMapping; replacement: ModuleReplacement }>
    >(`/api/replacements/${query}`)

    const map: Record<string, ModuleReplacement> = {}
    for (const [key, spec] of entries) {
      const match = response?.[spec.name]
      if (match?.replacement) {
        map[key] = match.replacement
      }
    }
    return map
  } catch {
    return {}
  }
}

/**
 * Fetch module replacement suggestions for a set of dependencies.
 * Returns an AsyncData result.
 */
export function useReplacementDependencies(
  dependencies: MaybeRefOrGetter<Record<string, DependencySpec> | undefined>,
) {
  const key = computed(() => {
    const deps = toValue(dependencies)
    if (!deps || Object.keys(deps).length === 0) return 'replacements:none'
    const sortedKeys = Object.keys(deps).sort()
    return `replacements:${sortedKeys.map(k => `${k}@${deps[k]!.version}`).join(',')}`
  })

  const { data, status, error } = useAsyncData<Record<string, ModuleReplacement>>(
    () => key.value,
    async () => {
      const deps = toValue(dependencies)
      if (!deps || Object.keys(deps).length === 0) {
        return {}
      }
      return await fetchReplacements(deps)
    },
    {
      watch: [key],
      default: () => ({}),
    },
  )

  return {
    data,
    status,
    error,
  }
}
