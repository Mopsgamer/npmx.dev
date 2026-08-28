<script setup lang="ts">
import type { PackageDependencyItem } from '#shared/types/package-dependencies'
import { packageDependencyInsightsKey } from '~/composables/packageDependencyInsightsKey'
import type { ColumnConfig } from '#shared/types/preferences'

const props = defineProps<{
  item: PackageDependencyItem
  showSkeleton: boolean
  index?: number
}>()

const item = computed(() => props.item)

const parentInsights = inject(packageDependencyInsightsKey, null)

// Fetch rich package metadata from API
const { data: meta } = useLazyFetch<PackageMetaResponse>(
  () => `/api/registry/package-meta/${encodePackageName(props.item.name)}`,
  { server: false },
)

const searchResult = computed(() => {
  if (!meta.value) return null
  const result = metaToSearchResult(meta.value)
  result.package.version = props.item.range
  return result
})

// Define the columns we want to show for dependencies
const dependencyColumns = computed<ColumnConfig[]>(() => [
  { id: 'version', visible: true, sortable: false },
  { id: 'description', visible: true, sortable: false },
  { id: 'downloads', visible: true, sortable: false },
  { id: 'updated', visible: true, sortable: false },
])
</script>

<template>
  <PackageTableRow
    v-if="searchResult && !showSkeleton"
    :result="searchResult"
    :columns="dependencyColumns"
    :index="index"
    :insights="parentInsights || undefined"
  >
    <template #status-indicators="{ insights: activeInsights }">
      <DependenciesStatusIndicators
        :name="item.name"
        :flags="item.flags"
        v-bind="activeInsights ? { insights: activeInsights } : {}"
        class="relative z-10"
      />
    </template>
  </PackageTableRow>

  <!-- Skeleton row -->
  <tr v-else class="border-b border-border">
    <td class="py-2 px-3">
      <div class="flex items-center gap-2">
        <span class="i-simple-icons:npm w-3.5 h-3.5 opacity-20 shrink-0" aria-hidden="true" />
        <SkeletonBlock class="h-4 w-32" />
      </div>
    </td>
    <td class="py-2 px-3">
      <SkeletonBlock class="h-4 w-12" />
    </td>
    <td class="py-2 px-3">
      <SkeletonBlock class="h-4 w-48" />
    </td>
    <td class="py-2 px-3">
      <SkeletonBlock class="h-4 w-16 ms-auto" />
    </td>
    <td class="py-2 px-3">
      <SkeletonBlock class="h-4 w-20 ms-auto" />
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
