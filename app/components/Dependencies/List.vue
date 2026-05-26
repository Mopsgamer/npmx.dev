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
    @update:sort="emit('update:sort', $event)"
  />
  <ol v-else class="list-none m-0 p-0 grid gap-4 sm:grid-cols-2">
    <li v-for="item in items" :key="item.name">
      <DependenciesCard :item="item" />
    </li>
  </ol>
</template>
