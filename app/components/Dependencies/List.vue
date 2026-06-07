<script setup lang="ts">
import type {
  DependencySortOption,
  PackageDependencyItem,
} from '#shared/types/package-dependencies'
import type { ViewMode } from '#shared/types/preferences'

defineProps<{
  items: PackageDependencyItem[]
  viewMode: ViewMode
  sort: DependencySortOption
  showSkeleton: boolean
}>()

const emit = defineEmits<{
  'update:sort': [value: DependencySortOption]
}>()
</script>

<template>
  <DependenciesTable
    v-if="viewMode === 'table'"
    :items="items"
    :sort="sort"
    :show-skeleton="showSkeleton"
    @update:sort="emit('update:sort', $event)"
  />
  <ol v-else class="list-none m-0 p-0 flex flex-col gap-4">
    <li v-for="item in items" :key="item.name">
      <DependenciesCard :item="item" :show-skeleton="showSkeleton" />
    </li>
  </ol>
</template>
