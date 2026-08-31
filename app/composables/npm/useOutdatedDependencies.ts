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

function resolveOutdated(
  versions: string[],
  latestTag: string,
  constraint: string,
): OutdatedDependencyInfo | null {
  if (constraint === 'latest') {
    return {
      resolved: latestTag,
      latest: latestTag,
      majorsBehind: 0,
      minorsBehind: 0,
      diffType: null,
    }
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

/**
 * Check for outdated dependencies via fast-npm-meta batch version lookups.
 * Returns a reactive map of dependency name to outdated info.
 */
export function useOutdatedDependencies(
  dependencies: MaybeRefOrGetter<Record<string, DependencySpec> | undefined>,
) {
  const outdated = shallowRef<Record<string, OutdatedDependencyInfo>>({})
  const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
  const error = ref<Error | null>(null)
  let currentEpoch = 0

  async function fetchOutdatedInfo(
    deps: Record<string, DependencySpec> | undefined,
    epoch: number,
  ) {
    if (epoch !== currentEpoch) return
    status.value = 'pending'
    error.value = null

    try {
      if (!deps || Object.keys(deps).length === 0) {
        if (epoch !== currentEpoch) return
        outdated.value = {}
        status.value = 'success'
        return
      }

      const semverEntries = Object.entries(deps).filter(
        ([, spec]) => !isNonSemverConstraint(spec.version),
      )

      if (semverEntries.length === 0) {
        if (epoch !== currentEpoch) return
        outdated.value = {}
        status.value = 'success'
        return
      }

      const uniquePackageNames = Array.from(new Set(semverEntries.map(([, spec]) => spec.name)))

      const chunks: string[][] = []
      for (let i = 0; i < uniquePackageNames.length; i += BATCH_SIZE) {
        chunks.push(uniquePackageNames.slice(i, i + BATCH_SIZE))
      }

      // Use allSettled so a failing chunk doesn't discard results from successful ones
      const batchResults = await Promise.allSettled(
        chunks.map(chunk => getVersionsBatch(chunk, { throw: false })),
      )

      if (epoch !== currentEpoch) return

      let anyChunkFailed = false
      const allVersionData = batchResults.flatMap(result => {
        if (result.status === 'fulfilled') return result.value
        anyChunkFailed = true
        return []
      })

      // Build a lookup map from package name to version data
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

      if (epoch !== currentEpoch) return
      outdated.value = results
      // Keep partial results from successful chunks; only surface error if ALL chunks failed
      if (anyChunkFailed && Object.keys(results).length === 0) {
        status.value = 'error'
        error.value = new Error('Failed to fetch version data for all dependency chunks')
      } else {
        status.value = 'success'
      }
    } catch (err) {
      if (epoch !== currentEpoch) return
      error.value = err instanceof Error ? err : new Error(String(err))
      status.value = 'error'
    }
  }

  watch(
    () => toValue(dependencies),
    deps => {
      const epoch = ++currentEpoch

      if (!deps) {
        outdated.value = {}
        status.value = 'idle'
        return
      }

      if (Object.keys(deps).length === 0) {
        outdated.value = {}
        status.value = 'success'
        return
      }

      fetchOutdatedInfo(deps, epoch).catch(err => {
        if (epoch !== currentEpoch) return
        error.value = err instanceof Error ? err : new Error(String(err))
        status.value = 'error'
      })
    },
    { immediate: true },
  )

  return {
    data: outdated,
    status,
    error,
  }
}
