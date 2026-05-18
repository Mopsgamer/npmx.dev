<script setup lang="ts">
import { WindowVirtualizer } from 'virtua/vue'
import type { SizeEntry } from '~/types/size'
import type { ViewMode } from '#shared/types/preferences'
import type { IconClass } from '~/types'

const props = defineProps<{
  entries: SizeEntry[]
  viewMode?: ViewMode
  isLoading?: boolean
}>()

const { t } = useI18n()

const sortColumn = defineModel<keyof SizeEntry>('sortColumn', { default: 'selfSize' })
const sortDir = defineModel<'asc' | 'desc'>('sortDir', { default: 'desc' })

const currentViewMode = computed(() => props.viewMode ?? 'cards')

const listRef = useTemplateRef<{ scrollToIndex: (idx: number, opts: any) => void }>('listRef')

function scrollToIndex(index: number, smooth = true) {
  listRef.value?.scrollToIndex(index, { align: 'center', smooth })
}

type SortOption = {
  icon: IconClass | ''
  col: keyof SizeEntry
  label: string
  defaultDir: 'asc' | 'desc'
}

const sortOptions = computed<SortOption[]>(() => [
  { icon: 'i-lucide:tag', col: 'name', label: t('common.sort.name'), defaultDir: 'asc' },
  {
    icon: 'i-lucide:package-open',
    col: 'selfSize',
    label: t('package.sizes.columns.self_size'),
    defaultDir: 'desc',
  },
  {
    icon: 'i-lucide:boxes',
    col: 'totalSize',
    label: t('package.sizes.columns.total_size'),
    defaultDir: 'desc',
  },
  { icon: 'i-lucide:network', col: 'depCount', label: t('package.stats.deps'), defaultDir: 'desc' },
  {
    icon: 'i-lucide:percent',
    col: 'percentage',
    label: t('package.sizes.columns.percentage'),
    defaultDir: 'desc',
  },
])

function toggleSort(col: keyof SizeEntry, defaultDir: 'asc' | 'desc') {
  if (sortColumn.value === col) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortColumn.value = col
    sortDir.value = defaultDir
  }
}

defineExpose({
  scrollToIndex,
})
</script>

<template>
  <div>
    <!-- Table View -->
    <template v-if="currentViewMode === 'table'">
      <PackageSizeTable
        :entries="entries"
        v-model:sort-column="sortColumn"
        v-model:sort-dir="sortDir"
        :is-loading="isLoading"
      />
    </template>

    <!-- Card View -->
    <template v-else>
      <!-- Sort controls -->
      <div class="flex items-center gap-2 mb-4 flex-wrap py-3 px-2 -mx-2 border-b border-border/50">
        <span class="text-xs text-fg-muted font-mono shrink-0">{{ t('common.sort_by') }}:</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="opt in sortOptions"
            :key="opt.col"
            type="button"
            class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded-md border transition-colors focus-visible:ring-2 focus-visible:ring-fg focus-visible:outline-none"
            :class="
              sortColumn === opt.col
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-fg-muted hover:text-fg hover:border-fg-subtle'
            "
            @click="toggleSort(opt.col, opt.defaultDir)"
          >
            <span v-if="opt.icon" class="size-[1em]" :class="opt.icon" />
            {{ opt.label }}
            <span
              v-if="sortColumn === opt.col"
              class="i-lucide:chevron-down w-3 h-3"
              :class="sortDir === 'asc' ? 'rotate-180' : ''"
            />
          </button>
        </div>
      </div>
      <ClientOnly>
        <WindowVirtualizer
          ref="listRef"
          :data="entries"
          :item-size="140"
          as="ol"
          item="li"
          class="list-none m-0 p-0"
        >
          <template #default="{ item }">
            <div class="pb-4">
              <PackageSizeCard :key="item.name" :entry="item" />
            </div>
          </template>
        </WindowVirtualizer>
      </ClientOnly>
      <!-- Initial loading state for cards -->
      <div v-if="isLoading" class="py-12 flex items-center justify-center">
        <div class="flex items-center gap-3 text-fg-muted font-mono text-sm">
          <span
            class="w-5 h-5 border-2 border-fg-subtle border-t-fg rounded-full motion-safe:animate-spin"
          />
          {{ $t('common.loading') }}
        </div>
      </div>
    </template>
  </div>
</template>
