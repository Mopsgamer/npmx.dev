<script setup lang="ts">
import type {
  DependencySortOption,
  PackageDependencyItem,
} from '#shared/types/package-dependencies'
import type { ViewMode } from '#shared/types/preferences'
import type { PackageDependencyInsights } from '~/composables/usePackageDependencyInsights'
import { onKeyDown } from '@vueuse/core'

defineProps<{
  items: PackageDependencyItem[]
  viewMode: ViewMode
  sort: DependencySortOption
  showSkeleton: boolean
  insights?: PackageDependencyInsights
}>()

const emit = defineEmits<{
  'update:sort': [value: DependencySortOption]
}>()

const keyboardShortcuts = useKeyboardShortcuts()

const isVisible = (el: HTMLElement) => el.getClientRects().length > 0

function getFocusableElements(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('#header-search, #deps-filter, [data-result-index]'),
  )
    .filter(isVisible)
    .sort((a, b) => {
      const aIdx = Number.parseInt(a.dataset.resultIndex ?? '0', 10)
      const bIdx = Number.parseInt(b.dataset.resultIndex ?? '0', 10)
      return aIdx - bIdx
    })
}

function focusElement(el: HTMLElement) {
  el.focus()
  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

function handleResultsKeydown(e: KeyboardEvent) {
  if (!keyboardShortcuts.value) {
    return
  }

  const elements = getFocusableElements()
  if (elements.length === 0) return

  const currentIndex = elements.findIndex(
    el => el === document.activeElement || el.contains(document.activeElement),
  )

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    const firstDataEntry = elements.findIndex(el => el.matches('[data-result-index]'))
    const nextIndex =
      firstDataEntry >= 0 && currentIndex < 0
        ? firstDataEntry
        : Math.min(currentIndex + 1, elements.length - 1)
    const el = elements[nextIndex]
    if (el) focusElement(el)
    return
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault()
    const nextIndex = Math.max(currentIndex - 1, 0)
    const el = elements[nextIndex]
    if (el) focusElement(el)
    return
  }

  if (e.key === 'Enter') {
    if (document.activeElement && elements.includes(document.activeElement as HTMLElement)) {
      const el = document.activeElement as HTMLElement
      if (el.tagName !== 'A') {
        e.preventDefault()
        el.click()
      }
    }
  }
}

onKeyDown(['ArrowDown', 'ArrowUp', 'Enter'], handleResultsKeydown)
</script>

<template>
  <DependenciesTable
    v-show="viewMode === 'table'"
    :items="items"
    :sort="sort"
    :show-skeleton="showSkeleton"
    :insights="insights"
    class="dependencies-list-element"
    @update:sort="emit('update:sort', $event)"
  />
  <ol
    v-show="viewMode === 'cards'"
    class="dependencies-list-element list-none m-0 p-0 flex flex-col gap-4"
  >
    <li v-for="(item, index) in items" :key="item.name">
      <DependenciesCard
        :item="item"
        :index="index"
        :show-skeleton="showSkeleton"
        :insights="insights"
      />
    </li>
  </ol>
</template>
