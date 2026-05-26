import { getOutdatedTooltip, getVersionClass } from '~/utils/npm/outdated-dependencies'
import { SEVERITY_TEXT_COLORS, getHighestSeverity } from '#shared/utils/severity'

export function usePackageDependencyInsights(
  packageName: MaybeRefOrGetter<string>,
  version: MaybeRefOrGetter<string>,
  dependencies: MaybeRefOrGetter<Record<string, string> | undefined>,
) {
  const { t } = useI18n()

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
  } = useDependencyAnalysis(packageName, version)

  const hasError = computed(() => {
    return !!(vulnError.value || outdatedError.value || replacementError.value)
  })

  function getVulnerableDepInfo(depName: string) {
    if (!vulnTree.value?.vulnerablePackages) return null
    return vulnTree.value.vulnerablePackages.find(p => p.name === depName && p.depth === 'direct')
  }

  function getDeprecatedDepInfo(depName: string) {
    if (!vulnTree.value?.deprecatedPackages) return null
    return vulnTree.value.deprecatedPackages.find(p => p.name === depName && p.depth === 'direct')
  }

  function getDepVersionTooltip(dep: string, depVersion: string) {
    const outdated = outdatedDeps.value?.[dep]
    if (outdated) return getOutdatedTooltip(outdated, t)
    return depVersion
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
    getDepVersionTooltip,
    getDepVersionClass,
  }
}

export type PackageDependencyInsights = ReturnType<typeof usePackageDependencyInsights>

export { SEVERITY_TEXT_COLORS, getHighestSeverity }
