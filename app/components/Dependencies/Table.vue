<script setup lang="ts">
import type {
  DependencySortOption,
  PackageDependencyItem,
} from '#shared/types/package-dependencies'

const props = defineProps<{
  items: PackageDependencyItem[]
  sort: DependencySortOption
  showSkeleton: boolean
}>()

const emit = defineEmits<{
  'update:sort': [value: DependencySortOption]
}>()

function toggleNameSort() {
  emit('update:sort', props.sort === 'name-asc' ? 'name-desc' : 'name-asc')
}

const nameSortDirection = computed(() =>
  props.sort.startsWith('name') ? (props.sort === 'name-asc' ? 'asc' : 'desc') : null,
)
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-start">
      <thead class="border-b border-border">
        <tr>
          <th
            scope="col"
            class="py-3 px-3 text-xs text-start text-fg-muted font-mono font-medium uppercase tracking-wider whitespace-nowrap select-none hover:text-fg transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-fg focus-visible:ring-inset focus-visible:outline-none"
            :aria-sort="
              nameSortDirection
                ? nameSortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : undefined
            "
            tabindex="0"
            @click="toggleNameSort"
            @keydown.enter="toggleNameSort"
            @keydown.space.prevent="toggleNameSort"
          >
            <span class="inline-flex items-center gap-1">
              {{ $t('filters.columns.name') }}
              <span
                v-if="nameSortDirection"
                class="i-lucide:chevron-down w-3 h-3"
                :class="nameSortDirection === 'asc' ? 'rotate-180' : ''"
                aria-hidden="true"
              />
              <span
                v-else
                class="i-lucide:chevrons-up-down w-3 h-3 opacity-30"
                aria-hidden="true"
              />
            </span>
          </th>
          <th
            scope="col"
            class="py-3 px-3 text-xs text-end text-fg-muted font-mono font-medium uppercase tracking-wider whitespace-nowrap select-none"
          >
            {{ $t('filters.columns.version') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <DependenciesTableRow
          v-for="item in items"
          :key="item.name"
          :item="item"
          :show-skeleton="showSkeleton"
        />
      </tbody>
    </table>

    <div v-if="items.length === 0" class="py-12 text-center text-fg-subtle font-mono text-sm">
      {{ $t('package.dependencies.no_matches') }}
    </div>
  </div>
</template>
