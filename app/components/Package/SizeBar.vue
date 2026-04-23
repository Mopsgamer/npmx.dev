<script setup lang="ts">
import type { NuxtError } from '#app'
import type { InstallSizeResult } from '#shared/types/install-size'

const { t } = useI18n()

const props = defineProps<{
  packageName: string
  version: string
  packageSize?: InstallSizeResult | null
  dependencies?: Record<string, string>
  bundledDependencies?: boolean | string[]
}>()

const { data: sizereqData, pending: sizereqLoading } = usePackageDependencySizes(
  () => props.packageName,
  () => props.version,
  () => props.dependencies,
)

// Minimum percentage to be shown as an individual slice
const THRESHOLD_PERCENT = 2

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

  const allMapped = props.packageSize.dependencies.map(depSize => {
    let bundled = false
    switch (typeof props.bundledDependencies) {
      case 'boolean':
        bundled = props.bundledDependencies
        break
      case 'object':
        bundled = props.bundledDependencies.some(name => name === depSize.name)
        break
    }
    const percent = props.packageSize ? (depSize.size / props.packageSize.totalSize) * 100 : 0
    const serverData = sizereqData.value?.[depSize.name]
    const error = serverData?.kind === 'error' ? serverData.error : null
    return {
      info:
        serverData?.kind === 'success' && serverData.packageSize
          ? {
              package: depSize.name,
              version: depSize.version,
              totalSize: serverData.packageSize.totalSize,
              selfSize: serverData.packageSize.selfSize,
            }
          : {
              package: depSize.name,
              version: depSize.version,
              totalSize: depSize.size,
              selfSize: depSize.size,
            },
      error,
      bundled,
      percent,
    } as Sizereq
  })

  const visible: Sizereq[] = []
  const others: Sizereq[] = []

  for (const dep of allMapped) {
    const percentage = (dep.info.selfSize / props.packageSize.totalSize) * 100
    if (percentage >= THRESHOLD_PERCENT) {
      visible.push({ ...dep, percent: percentage })
    } else {
      others.push(dep)
    }
  }

  const othersSelfSize = others.reduce((acc, d) => acc + d.info.selfSize, 0)
  const othersPercentage = (othersSelfSize / props.packageSize.totalSize) * 100

  return { visible, others, totalOthersSize: othersSelfSize, othersPercentage }
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
    ...visiblePart.flatMap(size => [size.info.package, getDepSizeTooltip(size.info.package), '']),
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

  const self = props.packageSize.selfSize || 0
  const depsSum = [
    ...sortedSizereqDependecies.value.visible,
    ...sortedSizereqDependecies.value.others,
  ].reduce((acc, d) => acc + d.info.selfSize, 0)

  const width = ((total - (self + depsSum)) / total) * 100
  return Math.max(0, width)
})

const { getTooltipText: getDepSizeTooltip } = usePackageDependencySizeTooltip(
  sizereqData,
  () => props.packageSize,
  t,
)

const numberFormatter = useNumberFormatter()
const bytesFormatter = useBytesFormatter()
</script>

<template>
  <div class="gap-0.5 flex flex-row h-6 w-full bg-fg-muted/10 overflow-hidden rounded-md">
    <TooltipApp
      v-if="selfSizeWidth > 0"
      :text="
        t('package.stats.size_tooltip.unpacked', {
          size: bytesFormatter.format(props.packageSize?.selfSize || 0),
        })
      "
      class="h-full bg-accent"
      :style="{ width: selfSizeWidth + '%' }"
    />

    <template v-for="dep in sortedSizereqDependecies.visible" :key="dep.info.package">
      <TooltipApp
        :text="`${dep.info.package}\n${getDepSizeTooltip(dep.info.package)}`"
        class="h-full"
        :class="dep.bundled ? 'bg-accent' : 'bg-fg'"
        :style="{ width: dep.percent + '%' }"
      >
        <RouterLink
          :to="packageRoute(dep.info.package, dep.info.version)"
          class="block w-full h-full"
        />
      </TooltipApp>
    </template>

    <TooltipApp
      v-if="sortedSizereqDependecies.others.length > 0"
      :text="othersTooltip"
      class="h-full bg-fg flex items-center justify-center"
      :style="{ width: sortedSizereqDependecies.othersPercentage + '%' }"
    >
      <span class="i-lucide:layers-2 w-3 h-3 text-bg" aria-hidden="true" />
    </TooltipApp>

    <div v-if="remainingWidth > 0" class="h-full bg-bg-elevated animate-skeleton-pulse flex-1" />
  </div>
</template>
