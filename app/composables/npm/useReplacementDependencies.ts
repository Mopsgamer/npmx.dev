import type { ModuleReplacement, ModuleReplacementMapping } from 'module-replacements'
import { ref, shallowRef, watch, toValue } from 'vue'

async function fetchReplacements(
  deps: Record<string, string>,
): Promise<Record<string, ModuleReplacement>> {
  const names = Object.keys(deps)
  if (names.length === 0) return {}

  // Single item: use the single-lookup endpoint (same response shape)
  if (names.length === 1) {
    const name = names[0]!
    try {
      const response = await $fetch<{
        mapping: ModuleReplacementMapping
        replacement: ModuleReplacement
      } | null>(`/api/replacements/${encodeURIComponent(name)}`)
      return response?.replacement ? { [name]: response.replacement } : {}
    } catch {
      return {}
    }
  }

  // Multiple items: batch query (comma-separated) — single round-trip
  try {
    const query = names.map(encodeURIComponent).join(',')
    const response = await $fetch<
      Record<string, { mapping: ModuleReplacementMapping; replacement: ModuleReplacement }>
    >(`/api/replacements/${query}`)

    const map: Record<string, ModuleReplacement> = {}
    for (const name of names) {
      if (response?.[name]?.replacement) {
        map[name] = response[name].replacement
      }
    }
    return map
  } catch {
    return {}
  }
}

/**
 * Fetch module replacement suggestions for a set of dependencies.
 * Returns a reactive map of dependency name to ModuleReplacement.
 */
export function useReplacementDependencies(
  dependencies: MaybeRefOrGetter<Record<string, string> | undefined>,
) {
  const replacements = shallowRef<Record<string, ModuleReplacement>>({})
  const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
  const error = ref<Error | null>(null)
  let generation = 0

  // On the server, replacements are a client-only enhancement — mark as success immediately
  // so isLoading doesn't get stuck waiting for a watcher that won't run on SSR.
  if (!import.meta.client) {
    status.value = 'success'
    return { data: replacements, status, error }
  }

  watch(
    () => toValue(dependencies),
    async deps => {
      const currentGeneration = ++generation
      status.value = 'pending'
      error.value = null

      try {
        if (!deps || Object.keys(deps).length === 0) {
          if (currentGeneration === generation) {
            replacements.value = {}
            // 'success' (not 'idle') — no deps means nothing to fetch, not "hasn't started yet"
            status.value = 'success'
          }
          return
        }

        const result = await fetchReplacements(deps)

        if (currentGeneration === generation) {
          replacements.value = result
          status.value = 'success'
        }
      } catch (err) {
        if (currentGeneration === generation) {
          error.value = err instanceof Error ? err : new Error(String(err))
          status.value = 'error'
        }
      }
    },
    { immediate: true },
  )

  return {
    data: replacements,
    status,
    error,
  }
}
