<script setup lang="ts">
import type { DepSectionId, PackageDependencySection } from '#shared/types/package-dependencies'
import type { RouteLocationRaw } from 'vue-router'

defineProps<{
  sections: PackageDependencySection[]
  activeSection: DepSectionId
  getSectionLink: (section: DepSectionId) => RouteLocationRaw
}>()

const isOpen = shallowRef(false)

const route = useRoute()
watch(
  () => route.fullPath,
  () => {
    isOpen.value = false
  },
)

const isLocked = useScrollLock(document)
watch(isOpen, open => (isLocked.value = open))

function toggle() {
  isOpen.value = !isOpen.value
}

defineExpose({ toggle })
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="isOpen" class="md:hidden fixed inset-0 z-40 bg-black/50" @click="isOpen = false" />
  </Transition>

  <Transition
    enter-active-class="transition-transform duration-200"
    enter-from-class="-translate-x-full"
    enter-to-class="translate-x-0"
    leave-active-class="transition-transform duration-200"
    leave-from-class="translate-x-0"
    leave-to-class="-translate-x-full"
  >
    <aside
      v-if="isOpen"
      class="md:hidden fixed inset-y-0 inset-is-0 z-50 w-72 bg-bg-subtle border-ie border-border overflow-y-auto"
    >
      <div
        class="sticky top-0 z-10 bg-bg-subtle border-b border-border px-4 py-3 flex items-center justify-start"
      >
        <span class="font-mono text-sm text-fg-muted">{{
          $t('package.dependencies.types_label')
        }}</span>
        <span aria-hidden="true" class="flex-shrink-1 flex-grow-1" />
        <ButtonBase
          :aria-label="$t('common.close')"
          @click="isOpen = false"
          classicon="i-lucide:x"
        />
      </div>
      <DependenciesSectionNav
        :sections="sections"
        :active-section="activeSection"
        :get-section-link="getSectionLink"
      />
    </aside>
  </Transition>
</template>
