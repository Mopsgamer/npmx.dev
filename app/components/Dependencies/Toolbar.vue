<script setup lang="ts">
import type { DependencySortOption } from '#shared/types/package-dependencies'
import type { ViewMode } from '#shared/types/preferences'

const props = defineProps<{
  filter: string
  sort: DependencySortOption
  viewMode: ViewMode
  filteredCount: number
  totalCount: number
  sections?: any[]
  activeSection?: string
}>()

const emit = defineEmits<{
  'update:filter': [value: string]
  'update:sort': [value: DependencySortOption]
  'update:viewMode': [value: ViewMode]
  'update:activeSection': [value: string]
}>()

const { t } = useI18n()

const filterValue = computed({
  get: () => props.filter,
  set: value => emit('update:filter', value),
})

const sortValue = computed({
  get: () => props.sort,
  set: value => emit('update:sort', value),
})

const viewModeValue = computed({
  get: () => props.viewMode,
  set: value => emit('update:viewMode', value),
})

const activeSectionValue = computed({
  get: () => props.activeSection,
  set: value => emit('update:activeSection', value!),
})

const sectionMeta = computed(() => {
  const labels: Record<string, string> = {
    dependencies: t('compare.dependencies'),
    devDependencies: t('compare.dev_dependencies'),
    peerDependencies: t('compare.peer_dependencies'),
    optionalDependencies: t('compare.optional_dependencies'),
    bundledDependencies: t('compare.bundled_dependencies'),
  }
  return (
    props.sections?.map(section => ({
      value: section.id,
      label: `${labels[section.id] || section.id} (${section.items.length})`,
    })) ?? []
  )
})

const sortOptions = computed(() => [
  { value: 'name-asc' as const, label: t('package.sort.name_asc') },
  { value: 'name-desc' as const, label: t('package.sort.name_desc') },
  { value: 'range-asc' as const, label: t('package.sort.range_asc') },
  { value: 'range-desc' as const, label: t('package.sort.range_desc') },
])

const showFilteredCount = computed(() => props.filter && props.filteredCount !== props.totalCount)
</script>

<template>
  <div class="flex flex-col gap-3 mb-4 border-b border-border pb-4">
    <div class="flex flex-col sm:flex-row sm:items-center gap-3">
      <div v-if="sections && sections.length > 0" class="flex items-center gap-2">
        <SelectField
          id="deps-section"
          v-model="activeSectionValue"
          :items="sectionMeta"
          size="sm"
          class="min-w-[180px]"
        />
        <span v-if="showFilteredCount" class="text-xs font-mono text-fg-muted">
          {{
            $t('package.list.showing_count', {
              filtered: filteredCount,
              total: totalCount,
            })
          }}
        </span>
      </div>
      <p v-else class="text-sm font-mono text-fg-muted shrink-0">
        <template v-if="showFilteredCount">
          {{
            $t('package.list.showing_count', {
              filtered: filteredCount,
              total: totalCount,
            })
          }}
        </template>
        <template v-else>
          {{ $t('package.dependencies.title', { count: $n(totalCount) }, totalCount) }}
        </template>
      </p>

      <div class="flex-1" />

      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div class="flex-1 relative min-w-0">
          <label for="deps-filter" class="sr-only">{{ $t('package.list.filter_label') }}</label>
          <div
            class="absolute h-full w-10 flex items-center justify-center text-fg-subtle pointer-events-none"
            aria-hidden="true"
          >
            <span class="i-lucide:search w-4 h-4" />
          </div>
          <InputBase
            id="deps-filter"
            v-model="filterValue"
            type="search"
            :placeholder="$t('package.dependencies.filter_placeholder')"
            no-correct
            class="w-full min-w-25 ps-10"
          />
        </div>

        <div class="flex items-center gap-3">
          <SelectField
            :label="$t('package.list.sort_label')"
            hidden-label
            id="deps-sort"
            class="relative flex-1 sm:flex-initial sm:shrink-0 min-w-0"
            v-model="sortValue"
            :items="sortOptions.map(o => ({ label: o.label, value: o.value }))"
          />

          <ViewModeToggle v-model="viewModeValue" class="shrink-0" />
        </div>
      </div>
    </div>
  </div>
</template>
