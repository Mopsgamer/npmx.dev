<script setup lang="ts">
import type { NuxtError } from '#app'
import { SEVERITY_TEXT_COLORS, getHighestSeverity } from '#shared/utils/severity'
import { getOutdatedTooltip, getVersionClass } from '~/utils/npm/outdated-dependencies'

const { t } = useI18n()

const props = defineProps<{
  packageName: string
  version: string
  packageSize?: InstallSizeResult | null
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
  optionalDependencies?: Record<string, string>
  bundledDependencies?: boolean | string[]
}>()

// Fetch outdated info for dependencies
const outdatedDeps = useOutdatedDependencies(() => props.dependencies)

// Fetch replacement suggestions for dependencies
const replacementDeps = useReplacementDependencies(() => props.dependencies)

// Get vulnerability info from shared cache (already fetched by PackageVulnerabilityTree)
const { data: vulnTree } = useDependencyAnalysis(
  () => props.packageName,
  () => props.version,
)

// Check if a dependency has vulnerabilities (only direct deps)
function getVulnerableDepInfo(depName: string) {
  if (!vulnTree.value) return null
  return vulnTree.value.vulnerablePackages.find(p => p.name === depName && p.depth === 'direct')
}

// Check if a dependency is deprecated (only direct deps)
function getDeprecatedDepInfo(depName: string) {
  if (!vulnTree.value) return null
  return vulnTree.value.deprecatedPackages.find(p => p.name === depName && p.depth === 'direct')
}

// Sort dependencies alphabetically
const sortedDependencies = computed(() => {
  if (!props.dependencies) return []
  return Object.entries(props.dependencies).sort(([a], [b]) => a.localeCompare(b))
})

// Sort peer dependencies alphabetically, with required first then optional
const sortedPeerDependencies = computed(() => {
  if (!props.peerDependencies) return []

  return Object.entries(props.peerDependencies)
    .map(([name, version]) => ({
      name,
      version,
      optional: props.peerDependenciesMeta?.[name]?.optional ?? false,
    }))
    .sort((a, b) => {
      // Required first, then optional
      if (a.optional !== b.optional) return a.optional ? 1 : -1
      return a.name.localeCompare(b.name)
    })
})

// Sort optional dependencies alphabetically
const sortedOptionalDependencies = computed(() => {
  if (!props.optionalDependencies) return []
  return Object.entries(props.optionalDependencies).sort(([a], [b]) => a.localeCompare(b))
})

// Fetch size information for dependencies that require it
const { data: serverSizes, pending: sizesLoading } = await useAsyncData(
  `sizes:${props.packageName}:${props.version}`,
  async (_app, { signal }) => {
    const entries = sortedDependencies.value

    const results = await Promise.all(
      entries.map<
        Promise<
          { kind: 'success'; packageSize: InstallSizeResult } | { kind: 'error'; error: NuxtError }
        >
      >(async ([name, version]) => {
        try {
          const { data: resolvedVersion, error } = await useResolvedVersion(name, version)

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
    watch: [sortedDependencies],
  },
)

// Minimum percentage to be shown as an individual slice
const THRESHOLD_PERCENT = 10

type Sizereq = {
  info: InstallSizeResult
  bundled: boolean
  percent: number
  error: NuxtError | null
}

// Process dependencies for size visualization
const sortedSizereqDependecies = computed(() => {
  if (!props.packageSize?.totalSize || !props.packageSize.dependencies) {
    return { visible: [], others: [], totalOthersSize: 0, othersPercentage: 0 }
  }

  const total = props.packageSize.totalSize

  // 1. Map everything first, preserving the 'bundled' flag from the source
  const allMapped = props.packageSize.dependencies
    .map(depSize => {
      const bundled = !sortedDependencies.value.some(([name]) => name === depSize.name)
      const percent = props.packageSize ? (depSize.size / props.packageSize.totalSize) * 100 : 0
      const serverData = serverSizes.value?.[depSize.name]
      const error = serverData?.kind === 'error' ? serverData.error : null
      return {
        info:
          serverData?.kind === 'success'
            ? {
                package: depSize.name,
                totalSize: serverData.packageSize?.totalSize ?? depSize.size,
                selfSize: serverData.packageSize?.selfSize ?? depSize.size,
              }
            : {
                package: depSize.name,
                totalSize: depSize.size,
                selfSize: depSize.size,
              },
        error,
        bundled,
        percent,
      } as Sizereq
    })
    .sort((a, b) => {
      // Bundled first
      if (a.bundled !== b.bundled) return a.bundled ? -1 : 1
      return b.info.totalSize - a.info.totalSize
    })

  const visible: Sizereq[] = []
  const others: Sizereq[] = []

  for (const dep of allMapped) {
    const percentage = (dep.info.totalSize / total) * 100
    if (percentage >= THRESHOLD_PERCENT) {
      visible.push({ ...dep, percent: percentage })
    } else {
      others.push(dep)
    }
  }

  const totalOthersSize = others.reduce((acc, d) => acc + d.info.totalSize, 0)
  const othersPercentage = (totalOthersSize / total) * 100

  if (othersPercentage < THRESHOLD_PERCENT || others.length === 1) {
    visible.push(others[0]!)
    others.length = 0
    visible.sort((a, b) => b.info.totalSize - a.info.totalSize)
  }

  return { visible, others, totalOthersSize, othersPercentage }
})

const othersTooltip = computed(() => {
  const others = sortedSizereqDependecies.value.others
  if (others.length === 0) return ''

  const MAX_VISIBLE_IN_TOOLTIP = 0
  const visiblePart = others.slice(0, MAX_VISIBLE_IN_TOOLTIP)
  const remainingCount = others.length - MAX_VISIBLE_IN_TOOLTIP

  const lines = [
    bytesFormatter.format(sortedSizereqDependecies.value.totalOthersSize),
    numberFormatter.value.format(sortedSizereqDependecies.value.othersPercentage),
    '',
    ...visiblePart.flatMap(size => [size.info.package, getDepSizeTooltipText(size), '']),
  ]

  if (remainingCount > 0) {
    lines.push(t('package.size_increase.deps', { count: remainingCount }))
  }

  return lines.join('\n')
})

const selfSizeWidth = computed(() => {
  if (!props.packageSize?.selfSize || !props.packageSize?.totalSize) return 0
  return (props.packageSize.selfSize / props.packageSize.totalSize) * 100
})

const remainingWidth = computed(() => {
  const total = props.packageSize?.totalSize
  if (!total) return 100

  // Sum up everything we actually HAVE data for
  const self = props.packageSize.selfSize || 0
  const depsSum = [
    ...sortedSizereqDependecies.value.visible,
    ...sortedSizereqDependecies.value.others,
  ].reduce((acc, d) => acc + d.info.totalSize, 0)

  const width = ((total - (self + depsSum)) / total) * 100
  return Math.max(0, width)
})

// Get dependency size tooltip
function getDepSizeTooltip(dep: string): string | undefined {
  const size = [
    ...sortedSizereqDependecies.value.visible,
    ...sortedSizereqDependecies.value.others,
  ].find(d => d.info.package === dep)
  return size && getDepSizeTooltipText(size)
}

function getDepSizeTooltipText(size: Sizereq): string {
  const packageSize = size?.error ? undefined : size?.info
  const percent = size?.percent
  return [
    size?.error?.message,
    percent && numberFormatter.value.format(percent),
    packageSize &&
      packageSize?.totalSize !== packageSize?.selfSize &&
      t('package.stats.size_tooltip.unpacked', {
        size: bytesFormatter.format(packageSize.selfSize!),
      }),
    packageSize?.totalSize &&
      t('package.stats.size_tooltip.total', {
        count: packageSize.dependencyCount,
        size: bytesFormatter.format(packageSize.totalSize),
      }),
  ]
    .filter(Boolean)
    .join('\n')
}

// Get version tooltip
function getDepVersionTooltip(dep: string, version: string) {
  const outdated = outdatedDeps.value[dep]
  if (outdated) return getOutdatedTooltip(outdated, t)
  if (getVulnerableDepInfo(dep) || getDeprecatedDepInfo(dep)) return version
  if (replacementDeps.value[dep]) return t('package.dependencies.has_replacement')
  return version
}

// Get version class
function getDepVersionClass(dep: string) {
  const outdated = outdatedDeps.value[dep]
  if (outdated) return getVersionClass(outdated)
  if (getVulnerableDepInfo(dep) || getDeprecatedDepInfo(dep)) return getVersionClass(undefined)
  if (replacementDeps.value[dep]) return 'text-amber-700 dark:text-amber-500'
  return getVersionClass(undefined)
}

const {
  visibleItems: visibleDeps,
  hasMore: hasMoreDeps,
  expand: expandDeps,
} = useVisibleItems(sortedDependencies, 10)

const {
  visibleItems: visiblePeerDeps,
  hasMore: hasMorePeerDeps,
  expand: expandPeerDeps,
} = useVisibleItems(sortedPeerDependencies, 10)

const {
  visibleItems: visibleOptionalDeps,
  hasMore: hasMoreOptionalDeps,
  expand: expandOptionalDeps,
} = useVisibleItems(sortedOptionalDependencies, 10)

const numberFormatter = useNumberFormatter()
const bytesFormatter = useBytesFormatter()
</script>

<template>
  <div class="space-y-8">
    <!-- Dependencies -->
    <CollapsibleSection
      v-if="sortedDependencies.length > 0"
      id="dependencies"
      :title="
        $t(
          'package.dependencies.title',
          {
            count: numberFormatter.format(sortedDependencies.length),
          },
          sortedDependencies.length,
        )
      "
    >
      <div class="gap-0.5 flex flex-row h-6 w-full bg-fg-muted/10 overflow-hidden rounded-md">
        <TooltipApp
          v-if="selfSizeWidth > 0"
          :text="
            t('package.stats.size_tooltip.unpacked', {
              size: bytesFormatter.format(props.packageSize?.selfSize || 0),
            })
          "
          class="h-full bg-blue-500"
          :style="{ width: selfSizeWidth + '%' }"
        />

        <template v-for="dep in sortedSizereqDependecies.visible" :key="dep.info.package">
          <TooltipApp
            :text="`${dep.info.package}\n${getDepSizeTooltip(dep.info.package)}`"
            class="h-full"
            :class="dep.bundled ? 'bg-blue-500' : 'bg-fg'"
            :style="{ width: dep.percent + '%' }"
          />
        </template>

        <TooltipApp
          v-if="sortedSizereqDependecies.others.length > 0"
          :text="othersTooltip"
          class="h-full bg-fg flex items-center justify-center"
          :style="{ width: sortedSizereqDependecies.othersPercentage + '%' }"
        >
          <span class="i-lucide:layers-2 w-3 h-3 text-bg" aria-hidden="true" />
        </TooltipApp>

        <div
          v-if="remainingWidth > 0"
          class="h-full bg-bg-elevated animate-skeleton-pulse flex-1"
        />
      </div>
      <ul class="space-y-1 list-none m-0" :aria-label="$t('package.dependencies.list_label')">
        <li
          v-for="[dep, version] in visibleDeps"
          :key="dep"
          class="flex items-center justify-between py-1 text-sm gap-2"
        >
          <LinkBase :to="packageRoute(dep)" class="block truncate" dir="ltr">
            {{ dep }}
          </LinkBase>
          <span class="flex items-center gap-1 max-w-[40%]" dir="ltr">
            <TooltipApp
              v-if="outdatedDeps[dep]"
              class="shrink-0"
              :class="getVersionClass(outdatedDeps[dep])"
              :text="getOutdatedTooltip(outdatedDeps[dep], $t)"
            >
              <button
                type="button"
                class="inline-flex items-center justify-center p-2 -m-2"
                :aria-label="getOutdatedTooltip(outdatedDeps[dep], $t)"
              >
                <span class="i-lucide:circle-alert w-3 h-3" aria-hidden="true" />
              </button>
            </TooltipApp>
            <TooltipApp
              v-if="replacementDeps[dep]"
              class="shrink-0 text-amber-700 dark:text-amber-500"
              :text="$t('package.dependencies.has_replacement')"
            >
              <button
                type="button"
                class="inline-flex items-center justify-center p-2 -m-2"
                :aria-label="$t('package.dependencies.has_replacement')"
              >
                <span class="i-lucide:lightbulb w-3 h-3" aria-hidden="true" />
              </button>
            </TooltipApp>
            <LinkBase
              v-if="getVulnerableDepInfo(dep)"
              :to="packageRoute(dep, getVulnerableDepInfo(dep)!.version)"
              class="shrink-0"
              :class="SEVERITY_TEXT_COLORS[getHighestSeverity(getVulnerableDepInfo(dep)!.counts)]"
              :title="
                $t('package.dependencies.vulnerabilities_count', {
                  count: getVulnerableDepInfo(dep)!.counts.total,
                })
              "
              classicon="i-lucide:shield-check"
            >
              <span class="sr-only">{{ $t('package.dependencies.view_vulnerabilities') }}</span>
            </LinkBase>
            <LinkBase
              v-if="getDeprecatedDepInfo(dep)"
              :to="packageRoute(dep, getDeprecatedDepInfo(dep)!.version)"
              class="shrink-0 text-purple-700 dark:text-purple-500"
              :title="getDeprecatedDepInfo(dep)!.message"
              classicon="i-lucide:octagon-alert"
            >
              <span class="sr-only">{{ $t('package.deprecated.label') }}</span>
            </LinkBase>
            <LinkBase
              :to="packageRoute(dep, version)"
              class="block truncate"
              :class="getDepVersionClass(dep)"
              :title="getDepVersionTooltip(dep, version)"
            >
              {{ version }}
            </LinkBase>
            <TooltipApp
              v-if="getDepSizeTooltip(dep)"
              class="shrink-0"
              :class="getVersionClass(undefined)"
              :text="getDepSizeTooltip(dep)"
            >
              <button
                type="button"
                class="inline-flex items-center justify-center p-2 -m-2 outline-none"
                :aria-label="getDepSizeTooltip(dep)"
              >
                <span
                  class="i-lucide:info w-3 h-3 opacity-50 transition-opacity hover:opacity-100"
                  :class="{
                    'i-svg-spinners:ring-resize': sizesLoading && !serverSizes?.[dep],
                  }"
                  aria-hidden="true"
                />
              </button>
            </TooltipApp>
            <span v-if="outdatedDeps[dep]" class="sr-only">
              ({{ getOutdatedTooltip(outdatedDeps[dep], $t) }})
            </span>
            <span v-if="getVulnerableDepInfo(dep)" class="sr-only">
              ({{
                $t('package.dependencies.vulnerabilities_count', {
                  count: getVulnerableDepInfo(dep)!.counts.total,
                })
              }})
            </span>
          </span>
        </li>
      </ul>
      <button
        v-if="hasMoreDeps"
        type="button"
        class="my-2 ms-1 font-mono text-xs text-fg-muted hover:text-fg transition-colors duration-200 rounded focus-visible:outline-accent/70"
        @click="expandDeps"
      >
        {{
          $t(
            'package.dependencies.show_all',
            {
              count: numberFormatter.format(sortedDependencies.length),
            },
            sortedDependencies.length,
          )
        }}
      </button>
    </CollapsibleSection>

    <!-- Peer Dependencies -->
    <CollapsibleSection
      v-if="sortedPeerDependencies.length > 0"
      id="peer-dependencies"
      :title="
        $t('package.peer_dependencies.title', {
          count: numberFormatter.format(sortedPeerDependencies.length),
        })
      "
    >
      <ul
        class="px-1 space-y-1 list-none m-0"
        :aria-label="$t('package.peer_dependencies.list_label')"
      >
        <li
          v-for="peer in visiblePeerDeps"
          :key="peer.name"
          class="flex items-center justify-between py-1 text-sm gap-1 min-w-0"
        >
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <LinkBase :to="packageRoute(peer.name)" class="block max-w-[70%] break-words" dir="ltr">
              {{ peer.name }}
            </LinkBase>
            <TagStatic v-if="peer.optional" :title="$t('package.dependencies.optional')">
              {{ $t('package.dependencies.optional') }}
            </TagStatic>
          </div>
          <LinkBase
            :to="packageRoute(peer.name, peer.version)"
            class="block truncate max-w-[30%]"
            :title="peer.version"
            dir="ltr"
          >
            {{ peer.version }}
          </LinkBase>
        </li>
      </ul>
      <button
        v-if="hasMorePeerDeps"
        type="button"
        class="mt-2 font-mono text-xs text-fg-muted hover:text-fg transition-colors duration-200 rounded focus-visible:outline-accent/70"
        @click="expandPeerDeps"
      >
        {{
          $t(
            'package.peer_dependencies.show_all',
            {
              count: numberFormatter.format(sortedPeerDependencies.length),
            },
            sortedPeerDependencies.length,
          )
        }}
      </button>
    </CollapsibleSection>

    <!-- Optional Dependencies -->
    <CollapsibleSection
      v-if="sortedOptionalDependencies.length > 0"
      id="optional-dependencies"
      :title="
        $t(
          'package.optional_dependencies.title',
          {
            count: numberFormatter.format(sortedOptionalDependencies.length),
          },
          sortedOptionalDependencies.length,
        )
      "
    >
      <ul
        class="px-1 space-y-1 list-none m-0"
        :aria-label="$t('package.optional_dependencies.list_label')"
      >
        <li
          v-for="[dep, version] in visibleOptionalDeps"
          :key="dep"
          class="flex items-baseline justify-between py-1 text-sm gap-2"
        >
          <LinkBase :to="packageRoute(dep)" class="block max-w-[80%] break-words" dir="ltr">
            {{ dep }}
          </LinkBase>
          <LinkBase
            :to="packageRoute(dep, version)"
            class="block truncate"
            :title="version"
            dir="ltr"
          >
            {{ version }}
          </LinkBase>
        </li>
      </ul>
      <button
        v-if="hasMoreOptionalDeps"
        type="button"
        class="mt-2 truncate"
        @click="expandOptionalDeps"
      >
        {{
          $t(
            'package.optional_dependencies.show_all',
            {
              count: numberFormatter.format(sortedOptionalDependencies.length),
            },
            sortedOptionalDependencies.length,
          )
        }}
      </button>
    </CollapsibleSection>
  </div>
</template>
