<script setup lang="ts">
import type { PackageDependencyItem } from '#shared/types/package-dependencies'
import type { PackageDependencyInsights } from '~/composables/usePackageDependencyInsights'
import type { ColumnConfig } from '#shared/types/preferences'
import { getVersionClass, getOutdatedTooltip } from '~/utils/npm/problematic-dependencies'

const props = defineProps<{
  insights?: PackageDependencyInsights
  item: PackageDependencyItem
  showSkeleton: boolean
  index?: number
}>()

const item = computed(() => props.item)

// Fetch rich package metadata from API
const { data: meta } = useLazyFetch<PackageMetaResponse>(
  () => `/api/registry/package-meta/${encodePackageName(item.value.name)}`,
  { server: false },
)

const searchResult = computed(() => {
  if (!meta.value) return null
  const result = metaToSearchResult(meta.value)
  result.package.version = item.value.range
  return result
})

const packageUrl = computed(() => packageRoute(item.value.name))

// Define the columns we want to show for dependencies
const dependencyColumns = computed<ColumnConfig[]>(() => [
  { id: 'version', visible: true, sortable: false },
  { id: 'description', visible: true, sortable: false },
  { id: 'downloads', visible: true, sortable: false },
  { id: 'updated', visible: true, sortable: false },
])

const outdated = computed(() => props.insights?.outdatedDeps.value[item.value.name])

const versionClass = computed(() => getVersionClass(item.value.name, props.insights))

const { t } = useI18n()
</script>

<template>
  <PackageTableRow
    v-if="searchResult && !showSkeleton"
    :result="searchResult"
    :columns="dependencyColumns"
    :index="index"
    :insights="insights || undefined"
  >
    <template #version="{ version }">
      <TooltipApp v-if="outdated" :text="getOutdatedTooltip(outdated, t)" position="top">
        <div :class="versionClass" class="flex items-center gap-1.5 cursor-help">
          <span class="i-lucide:arrow-up w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{{ version }}</span>
        </div>
      </TooltipApp>
      <div v-else class="flex items-center gap-1.5">
        <span>{{ version }}</span>
      </div>
    </template>
    <template #status-indicators="{ insights }">
      <DependenciesStatusIndicators
        :name="item.name"
        :flags="item.flags"
        v-bind="{ insights }"
        class="relative z-10"
      />
    </template>
  </PackageTableRow>

  <!-- Skeleton row -->
  <tr v-else class="border-b border-border">
    <td class="py-2 px-3">
      <NuxtLink
        :to="packageUrl"
        class="row-link font-mono text-sm transition-colors duration-200 inline-flex items-center gap-2 min-w-0"
        :data-result-index="index"
        dir="ltr"
      >
        <span class="i-simple-icons:npm w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span class="truncate">{{ item.name }}</span>
      </NuxtLink>
    </td>
    <td class="py-2 px-3 font-mono text-xs text-fg-subtle">
      <span dir="ltr">{{ item.range }}</span>
    </td>
    <td class="py-2 px-3 text-sm text-fg-muted max-w-xs truncate">
      <SkeletonBlock class="h-6 w-48" />
    </td>
    <td class="py-2 px-3 font-mono text-xs text-fg-muted text-end tabular-nums">
      <SkeletonBlock class="h-6 w-16 ms-auto" />
    </td>
    <td class="py-2 px-3 font-mono text-end text-xs text-fg-muted">
      <SkeletonBlock class="h-6 w-20 ms-auto" />
    </td>
  </tr>
</template>

<style scoped>
.row-link {
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    cursor: pointer;
  }

  &:focus-visible::after {
    outline: 2px solid var(--color-fg);
    outline-offset: -2px;
  }
}
</style>
