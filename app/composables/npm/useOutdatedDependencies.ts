import type { PackageVersionsInfo } from 'fast-npm-meta'
import { getVersionsBatch } from 'fast-npm-meta'
import { difference, findMaxSatisfying, getMajor, getMinor, isGreater, isStable } from 'verkit'
import {
  type OutdatedDependencyInfo,
  isNonSemverConstraint,
  constraintIncludesPrerelease,
} from '~/utils/npm/problematic-dependencies'
import type { DependencySpec } from '~/utils/npm/package-dependency-sections'

const BATCH_SIZE = 50

export function resolveOutdated(
  versions: string[],
  latestTag: string,
  constraint: string,
): OutdatedDependencyInfo | null {
  if (constraint === 'latest') {
    return null
  }

  let filteredVersions = versions
  if (!constraintIncludesPrerelease(constraint)) {
    filteredVersions = versions.filter(v => isStable(v))
  }

  const resolved = findMaxSatisfying(filteredVersions, constraint)
  if (!resolved) return null

  if (resolved === latestTag) return null

  // Resolved is newer than latest (e.g. ^2.0.0-rc when latest is 1.x)
  if (isGreater(resolved, latestTag)) {
    return null
  }

  const diffType = difference(resolved, latestTag)
  const majorsBehind = getMajor(latestTag) - getMajor(resolved)
  const minorsBehind = majorsBehind === 0 ? getMinor(latestTag) - getMinor(resolved) : 0

  return {
    resolved,
    latest: latestTag,
    majorsBehind,
    minorsBehind,
    diffType,
  }
}

async function fetchOutdatedMap(
  deps: Record<string, DependencySpec>,
): Promise<Record<string, OutdatedDependencyInfo>> {
  const semverEntries = Object.entries(deps).filter(
    ([, spec]) => !isNonSemverConstraint(spec.version),
  )

  if (semverEntries.length === 0) {
    return {}
  }

  const uniquePackageNames = Array.from(new Set(semverEntries.map(([, spec]) => spec.name)))

  const chunks: string[][] = []
  for (let i = 0; i < uniquePackageNames.length; i += BATCH_SIZE) {
    chunks.push(uniquePackageNames.slice(i, i + BATCH_SIZE))
  }

  const batchResults = await Promise.allSettled(
    chunks.map(chunk => getVersionsBatch(chunk, { throw: false })),
  )

  let anyChunkFailed = false
  const allVersionData = batchResults.flatMap(result => {
    if (result.status === 'fulfilled') return result.value
    anyChunkFailed = true
    return []
  })

  const versionMap = new Map<string, PackageVersionsInfo>()
  for (const data of allVersionData) {
    if ('error' in data) continue
    versionMap.set(data.name, data)
  }

  const results: Record<string, OutdatedDependencyInfo> = {}
  for (const [key, spec] of semverEntries) {
    const data = versionMap.get(spec.name)
    if (!data) continue

    const latestTag = data.distTags.latest
    if (!latestTag) continue

    const info = resolveOutdated(data.versions, latestTag, spec.version)
    if (info) {
      results[key] = info
    }
  }

  if (anyChunkFailed && Object.keys(results).length === 0) {
    throw new Error('Failed to fetch version data for all dependency chunks')
  }

  return results
}

/**
 * Check for outdated dependencies via fast-npm-meta batch version lookups.
 * Returns an AsyncData result.
 */
export function useOutdatedDependencies(
  dependencies: MaybeRefOrGetter<Record<string, DependencySpec> | undefined>,
) {
  const key = computed(() => {
    const deps = toValue(dependencies)
    if (deps === undefined) return ''
    if (Object.keys(deps).length === 0) return 'outdated:none'
    const sortedKeys = Object.keys(deps).sort()
    return `outdated:${sortedKeys.map(k => `${k}@${deps[k]!.version}`).join(',')}`
  })

  const { data, status, error } = useAsyncData<Record<string, OutdatedDependencyInfo>>(
    () => key.value,
    async () => {
      const deps = toValue(dependencies)
      if (!deps || Object.keys(deps).length === 0) {
        return {}
      }
      return await fetchOutdatedMap(deps)
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
