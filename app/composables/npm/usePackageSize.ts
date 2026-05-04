import type { AsyncData, NuxtError } from '#app'
import type { InstallSizeResult } from '#shared/types/install-size'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { toValue } from 'vue'
import { useAsyncData, useNumberFormatter, useBytesFormatter } from '#imports'

export const usePackageSize = (
  packageName: MaybeRefOrGetter<string>,
  version: MaybeRefOrGetter<string>,
  options: any = {},
) => {
  return useAsyncData(
    () => `install-size:${toValue(packageName)}:${toValue(version)}`,
    () =>
      $fetch<InstallSizeResult>(
        `/api/registry/install-size/${toValue(packageName)}/v/${toValue(version)}`,
      ),
    {
      watch: [() => toValue(packageName), () => toValue(version)],
      ...options,
    },
  )
}

/**
 * Fetches size information for all dependencies of a package.
 */
export function usePackageDependencySizes(
  packageName: MaybeRefOrGetter<string>,
  version: MaybeRefOrGetter<string>,
  dependencies?: MaybeRefOrGetter<DependencySize[] | undefined>,
): AsyncData<
  | Record<
      string,
      { kind: 'success'; packageSize: InstallSizeResult } | { kind: 'error'; error: NuxtError }
    >
  | undefined,
  NuxtError<unknown> | undefined
> {
  return useAsyncData(
    `install-size-deps:${toValue(packageName)}:${toValue(version)}`,
    async (_app, { signal }) => {
      const entries = toValue(dependencies) ?? []

      const results = await Promise.all(
        entries.map<
          Promise<
            | { kind: 'success'; packageSize: InstallSizeResult }
            | { kind: 'error'; error: NuxtError }
          >
        >(async ({ name, version: depVersion }) => {
          try {
            const { data: resolvedVersion, error } = await useResolvedVersion(name, depVersion)

            if (error.value || !resolvedVersion.value) return { kind: 'error', error: error.value! }

            return {
              kind: 'success',
              packageSize: await $fetch<InstallSizeResult>(
                `/api/registry/install-size/${name}/v/${encodeURIComponent(resolvedVersion.value)}`,
                { signal },
              ),
            }
          } catch (err) {
            return { kind: 'error', error: (err as Ref<NuxtError>)?.value }
          }
        }),
      )

      return results.reduce(
        (acc, curr) => {
          if (curr.kind === 'error') return acc
          acc[curr.packageSize.package] = curr
          return acc
        },
        {} as Record<
          string,
          { kind: 'success'; packageSize: InstallSizeResult } | { kind: 'error'; error: NuxtError }
        >,
      )
    },
    {
      server: false,
    },
  )
}

/**
 * Helper to generate dependency size tooltips.
 */
export function usePackageDependencySizeTooltip(
  sizereqData: Ref<Record<
    string,
    { kind: 'success'; packageSize: InstallSizeResult } | { kind: 'error'; error: NuxtError }
  > | null>,
  packageSize: MaybeRefOrGetter<InstallSizeResult | null | undefined>,
  t: (key: string, params?: Record<string, any>, count?: number) => string,
) {
  const numberFormatter = useNumberFormatter()
  const bytesFormatter = useBytesFormatter()

  function getTooltipText(dep: string): string | undefined {
    const data = sizereqData.value?.[dep]
    const total = toValue(packageSize)?.totalSize

    if (data?.kind === 'error') return data.error.message

    const info = data?.kind === 'success' ? data.packageSize : undefined
    if (!info && !total) return undefined

    const percent = total && info ? (info.selfSize / total) * 100 : undefined

    return [
      percent && numberFormatter.value.format(percent),
      info &&
        info?.totalSize !== info?.selfSize &&
        t('package.stats.size_tooltip.unpacked', {
          size: bytesFormatter.format(info.selfSize!),
        }),
      info?.totalSize &&
        t('package.stats.size_tooltip.total', {
          count: info.dependencyCount,
          size: bytesFormatter.format(info.totalSize),
        }),
    ]
      .filter(Boolean)
      .join('\n')
  }

  return {
    getTooltipText,
  }
}
