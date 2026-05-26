<script setup lang="ts">
import type { DepSectionId } from '#shared/types/package-dependencies'

const props = defineProps<{
  section: DepSectionId
}>()

const sectionTitleKeys: Record<DepSectionId, string> = {
  dependencies: 'compare.dependencies',
  devDependencies: 'compare.dev_dependencies',
  peerDependencies: 'compare.peer_dependencies',
  optionalDependencies: 'compare.optional_dependencies',
  bundledDependencies: 'package.deps_tab.sections.bundled',
}

const sectionTitle = computed(() => $t(sectionTitleKeys[props.section]))

defineEmits<{
  mobileNavToggle: []
}>()
</script>

<template>
  <div class="flex items-center gap-2 px-3 py-2 border-b border-border bg-bg-subtle min-h-11">
    <ButtonBase
      class="md:hidden px-2"
      :aria-label="$t('package.deps_tab.open_sections')"
      @click="$emit('mobileNavToggle')"
      classicon="i-lucide:panel-left"
    />

    <h2 class="font-mono text-sm text-fg m-0 truncate">{{ sectionTitle }}</h2>
  </div>
</template>
