<script setup lang="ts">
import type { SizeEntry } from '~/types/size'
import { getSizeRoute, packageRoute } from '~/utils/router'

const props = defineProps<{
  entries: SizeEntry[]
  isLoading?: boolean
  stickyOffset?: number
  isScrolled?: boolean
}>()

const { t } = useI18n()
const numberFormatter = useNumberFormatter()
const bytesFormatter = useBytesFormatter()

const sortColumn = defineModel<keyof SizeEntry>('sortColumn', { default: 'selfSize' })
const sortDir = defineModel<'asc' | 'desc'>('sortDir', { default: 'desc' })

function toggleSort(col: keyof SizeEntry) {
  if (sortColumn.value === col) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortColumn.value = col
    sortDir.value = 'desc'
  }
}
</script>

<template>
  <div class="overflow-x-auto border border-border rounded-lg bg-bg-elevated overflow-y-visible">
    <table class="w-full force-text-left border-collapse min-w-[600px]">
      <thead class="z-20">
        <tr class="bg-bg-subtle/50">
          <th
            v-for="col in [
              { key: 'name', label: t('common.sort.name'), align: 'left', width: 'auto' },
              {
                key: 'selfSize',
                label: t('package.sizes.columns.self_size'),
                align: 'right',
                width: '120px',
              },
              {
                key: 'totalSize',
                label: t('package.sizes.columns.total_size'),
                align: 'right',
                width: '120px',
              },
              { key: 'depCount', label: t('package.stats.deps'), align: 'right', width: '100px' },
              { key: 'percentage', label: '%', align: 'right', width: '120px' },
            ]"
            :key="col.key"
            class="z-20 bg-bg-subtle px-4 py-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle cursor-pointer hover:text-fg select-none border-b border-border/50"
            :class="col.align === 'right' ? 'text-end' : 'text-start'"
            :style="{ width: col.width }"
            tabindex="0"
            role="columnheader"
            @click="toggleSort(col.key as any)"
            @keydown.enter="toggleSort(col.key as any)"
            @keydown.space.prevent="toggleSort(col.key as any)"
          >
            <div
              class="flex items-center gap-1"
              :class="col.align === 'right' ? 'justify-end' : ''"
            >
              {{ col.label }}
              <span
                v-if="sortColumn === col.key"
                class="i-lucide:chevron-down w-3 h-3"
                :class="sortDir === 'asc' ? 'rotate-180' : ''"
              />
              <span v-else class="i-lucide:chevrons-up-down w-3 h-3 opacity-30" />
            </div>
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        <template v-if="isLoading && entries.length === 0">
          <tr
            v-for="i in 5"
            :key="`skeleton-${i}`"
            class="border-b border-border"
          >
            <td class="py-3 px-4" v-for="j in 5" :key="j">
              <div class="h-4 w-full bg-bg-muted rounded animate-pulse" />
            </td>
          </tr>
        </template>
        <template v-else>
          <tr
            v-for="entry in props.entries"
            :key="entry.name"
            class="hover:bg-bg-subtle transition-colors items-center"
          >
            <td class="px-4 py-3 min-w-0">
              <div class="flex items-center gap-3 min-w-0">
                <div class="flex-1 min-w-0">
                  <LinkBase
                    :to="packageRoute(entry.name, entry.version)"
                    class="block truncate font-mono text-sm font-medium"
                    :title="entry.name"
                  >
                    {{ entry.name }}
                  </LinkBase>
                  <div class="text-3xs text-fg-subtle font-mono mt-0.5">
                    {{ entry.version }}
                  </div>
                </div>
                <LinkBase
                  variant="button-secondary"
                  size="sm"
                  :to="getSizeRoute(entry.name, entry.version)"
                  classicon="i-lucide:list-tree"
                  class="flex-shrink-0 p-1.5 h-8 w-8"
                  :title="t('package.stats.view_all_sizes')"
                />
              </div>
            </td>
            <td class="px-4 py-3 text-end font-mono text-sm">
              {{ bytesFormatter.format(entry.selfSize) }}
            </td>
            <td class="px-4 py-3 text-end font-mono text-sm text-fg-muted">
              <template v-if="!Number.isNaN(entry.totalSize)">
                {{ bytesFormatter.format(entry.totalSize) }}
              </template>
              <template v-else>
                <div class="inline-block w-3 h-3 border-2 border-fg-muted/20 border-t-accent rounded-full animate-spin" aria-hidden="true" />
              </template>
            </td>
            <td class="px-4 py-3 text-end font-mono text-sm text-fg-muted">
              <template v-if="!Number.isNaN(entry.depCount)">
                {{ numberFormatter.format(entry.depCount) }}
              </template>
              <template v-else>
                <div class="inline-block w-3 h-3 border-2 border-fg-muted/20 border-t-accent rounded-full animate-spin" aria-hidden="true" />
              </template>
            </td>
            <td class="px-4 py-3 text-end font-mono text-sm">
              <div class="flex items-center justify-end gap-2">
                <span class="text-fg-subtle text-xs"
                  >{{ numberFormatter.format(entry.percentage) }}%</span
                >
                <div class="w-12 h-1 bg-fg-muted/10 rounded-full overflow-hidden hidden sm:block">
                  <div
                    class="h-full bg-accent rounded-full"
                    :style="{ width: `${entry.percentage}%` }"
                  />
                </div>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
