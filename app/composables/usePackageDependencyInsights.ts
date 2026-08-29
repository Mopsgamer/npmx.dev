import { getVersionClass } from '~/utils/npm/outdated-dependencies'

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

  const {
    data: vulnTree,
    status: vulnStatus,
    error: vulnError,
  } = useDependencyAnalysis(packageName, toValue(version).replace(/^[\^~>=<]+/, ''))

  const hasError = computed(() => {
    return !!(vulnError.value || outdatedError.value || replacementError.value)
  })

  function getVulnerableDepInfo(depName: string) {
    if (!vulnTree.value?.vulnerablePackages) return null
    return vulnTree.value.vulnerablePackages.find(
      p => p.name === depName && (p.depth === 'root' || p.depth === 'direct'),
    )
  }

  function getDeprecatedDepInfo(depName: string) {
    if (!vulnTree.value?.deprecatedPackages) return null
    return vulnTree.value.deprecatedPackages.find(
      p => p.name === depName && (p.depth === 'root' || p.depth === 'direct'),
    )
  }

  function getDepVersionClass(dep: string) {
    const outdated = outdatedDeps.value?.[dep]
    if (outdated) return getVersionClass(outdated)
    if (replacementDeps.value?.[dep]) return 'text-amber-700 dark:text-amber-500'
    if (getVulnerableDepInfo(dep) || getDeprecatedDepInfo(dep)) return getVersionClass(undefined)
    return getVersionClass(undefined)
  }

  return {
    outdatedDeps,
    outdatedStatus,
    replacementDeps,
    replacementStatus,
    vulnTree,
    vulnStatus,
    hasError,
    errors: { vulnError, outdatedError, replacementError },
    getVulnerableDepInfo,
    getDeprecatedDepInfo,
    getDepVersionClass,
  }
}

export type PackageDependencyInsights = ReturnType<typeof usePackageDependencyInsights>
