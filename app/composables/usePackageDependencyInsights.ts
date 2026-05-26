import { getOutdatedTooltip, getVersionClass } from '~/utils/npm/outdated-dependencies'
import { SEVERITY_TEXT_COLORS, getHighestSeverity } from '#shared/utils/severity'

export function usePackageDependencyInsights(
  packageName: MaybeRefOrGetter<string>,
  version: MaybeRefOrGetter<string>,
  dependencies: MaybeRefOrGetter<Record<string, string> | undefined>,
) {
  const { t } = useI18n()

  const outdatedDeps = useOutdatedDependencies(dependencies)
  const replacementDeps = useReplacementDependencies(dependencies)

  const { data: vulnTree } = useDependencyAnalysis(packageName, version)

  function getVulnerableDepInfo(depName: string) {
    if (!vulnTree.value) return null
    return vulnTree.value.vulnerablePackages.find(p => p.name === depName && p.depth === 'direct')
  }

  function getDeprecatedDepInfo(depName: string) {
    if (!vulnTree.value) return null
    return vulnTree.value.deprecatedPackages.find(p => p.name === depName && p.depth === 'direct')
  }

  function getDepVersionTooltip(dep: string, depVersion: string) {
    const outdated = outdatedDeps.value[dep]
    if (outdated) return getOutdatedTooltip(outdated, t)
    if (getVulnerableDepInfo(dep) || getDeprecatedDepInfo(dep)) return depVersion
    if (replacementDeps.value[dep]) return t('package.dependencies.has_replacement')
    return depVersion
  }

  function getDepVersionClass(dep: string) {
    const outdated = outdatedDeps.value[dep]
    if (outdated) return getVersionClass(outdated)
    if (replacementDeps.value[dep]) return 'text-amber-700 dark:text-amber-500'
    if (getVulnerableDepInfo(dep) || getDeprecatedDepInfo(dep)) return getVersionClass(undefined)
    return getVersionClass(undefined)
  }

  return {
    outdatedDeps,
    replacementDeps,
    getVulnerableDepInfo,
    getDeprecatedDepInfo,
    getDepVersionTooltip,
    getDepVersionClass,
  }
}

export { SEVERITY_TEXT_COLORS, getHighestSeverity }
