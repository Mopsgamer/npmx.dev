<script setup lang="ts">
import type { InstallSizeResult } from '#shared/types/install-size'

const props = withDefaults(
  defineProps<{
    packageName: string
    version: string
    packageSize?: InstallSizeResult | undefined
    dependencies?: Record<string, string>
    bundledDependencies?: boolean | string[]
    height?: string
  }>(),
  {
    height: 'h-6',
  },
)

const { data: sizereqData } = usePackageDependencySizes(
  props.packageName,
  props.version,
  props.packageSize?.dependencies,
)

// Minimum percentage to be shown as an individual slice
const THRESHOLD_PERCENT = 2

type Sizereq = {
  info: InstallSizeResult
  bundled: boolean
  percent: number
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
</script>

<template>
  <div
    :class="[
      props.height,
      'gap-0.5 flex flex-row w-full bg-fg-muted/10 overflow-hidden rounded-md',
    ]"
  >
    <div
      v-if="selfSizeWidth > 0"
      class="h-full bg-accent"
      :style="{ width: selfSizeWidth + '%' }"
    />

    <template v-for="dep in sortedSizereqDependecies.visible" :key="dep.info.package">
      <div
        class="h-full"
        :class="dep.bundled ? 'bg-accent' : 'bg-fg'"
        :style="{ width: dep.percent + '%' }"
      />
    </template>

    <div
      v-if="sortedSizereqDependecies.others.length > 0"
      class="h-full bg-fg flex items-center justify-center"
      :style="{ width: sortedSizereqDependecies.othersPercentage + '%' }"
    >
      <span class="i-lucide:network w-3 h-3 text-bg" aria-hidden="true" />
    </div>

    <div v-if="remainingWidth > 0" class="h-full bg-bg-elevated animate-skeleton-pulse flex-1" />
  </div>
</template>
