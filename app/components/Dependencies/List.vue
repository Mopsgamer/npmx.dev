<script setup lang="ts">
import type {
  DependencySortOption,
  PackageDependencyItem,
} from '#shared/types/package-dependencies'
import type { ViewMode } from '#shared/types/preferences'
import { onKeyDown } from '@vueuse/core'

defineProps<{
  items: PackageDependencyItem[]
  viewMode: ViewMode
  sort: DependencySortOption
  showSkeleton: boolean
}>()

const emit = defineEmits<{
  'update:sort': [value: DependencySortOption]
}>()

const keyboardShortcuts = useKeyboardShortcuts()

const isVisible = (el: HTMLElement) => el.getClientRects().length > 0

function getFocusableElements(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-result-index]'))
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

function focusSearchInput() {
  const searchInput = document.querySelector<HTMLInputElement>('input[type="search"], #deps-filter')
  searchInput?.focus()
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
    const nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, elements.length - 1)
    const el = elements[nextIndex]
    if (el) focusElement(el)
    return
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (currentIndex <= 0) {
      focusSearchInput()
      return
    }
    const nextIndex = currentIndex - 1
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
    class="dependencies-list-element"
    @update:sort="emit('update:sort', $event)"
  />
  <ol
    v-show="viewMode === 'cards'"
    class="dependencies-list-element list-none m-0 p-0 flex flex-col gap-4"
  >
    <li v-for="(item, index) in items" :key="item.name">
      <DependenciesCard :item="item" :index="index" :show-skeleton="showSkeleton" />
    </li>
  </ol>
</template>
