import { findMinimumForRange, normalize } from 'verkit'

export function usePackageDependencyInsights(
  packageName: MaybeRefOrGetter<string>,
  version: MaybeRefOrGetter<string>,
  dependencies: MaybeRefOrGetter<Record<string, string> | undefined>,
) {
  const {
    data: outdatedDeps,
    status: outdatedStatus,
    error: outdatedError,
  } = useOutdatedDependencies(dependencies)

  const {
    data: replacementDeps,
    status: replacementStatus,
    error: replacementError,
  } = useReplacementDependencies(dependencies)

  const minVersion = computed((): string => {
    const min = findMinimumForRange(toValue(version))
    return (min && normalize(min)) || ''
  })

  const {
    data: vulnTree,
    status: vulnStatus,
    error: vulnError,
  } = useDependencyAnalysis(packageName, minVersion)

  const hasError = computed(() => {
    return !!(vulnError.value || outdatedError.value || replacementError.value)
  })

  return {
    outdatedDeps,
    outdatedStatus,
    replacementDeps,
    replacementStatus,
    vulnTree,
    vulnStatus,
    hasError,
    errors: { vulnError, outdatedError, replacementError },
  }
}

export type PackageDependencyInsights = ReturnType<typeof usePackageDependencyInsights>
