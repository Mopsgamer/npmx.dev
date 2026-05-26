<script setup lang="ts">
import type { DepSectionId, PackageDependencySection } from '#shared/types/package-dependencies'
import type { RouteLocationRaw } from 'vue-router'

const props = defineProps<{
  sections: PackageDependencySection[]
  activeSection: DepSectionId
  getSectionLink: (section: DepSectionId) => RouteLocationRaw
}>()

const sectionMeta = computed<Record<DepSectionId, { label: string; icon: string; count: number }>>(
  () => {
    const map = {} as Record<DepSectionId, { label: string; icon: string; count: number }>
    for (const section of props.sections) {
      const labels: Record<DepSectionId, string> = {
        dependencies: $t('compare.dependencies'),
        devDependencies: $t('compare.dev_dependencies'),
        peerDependencies: $t('compare.peer_dependencies'),
        optionalDependencies: $t('compare.optional_dependencies'),
        bundledDependencies: $t('package.deps_tab.sections.bundled'),
      }
      const icons: Record<DepSectionId, string> = {
        dependencies: 'i-lucide:box',
        devDependencies: 'i-lucide:wrench',
        peerDependencies: 'i-lucide:users',
        optionalDependencies: 'i-lucide:circle-help',
        bundledDependencies: 'i-lucide:package',
      }
      map[section.id] = {
        label: labels[section.id],
        icon: icons[section.id],
        count: section.items.length,
      }
    }
    return map
  },
)
</script>

<template>
  <nav :aria-label="$t('package.deps_tab.section_nav')" class="py-2">
    <ul class="list-none m-0 p-0">
      <li v-for="section in sections" :key="section.id">
        <NuxtLink
          :to="getSectionLink(section.id)"
          class="flex items-center justify-between gap-2 ps-3 pe-3 py-1.5 text-xs font-mono hover:bg-bg-muted transition-[color,background-color] focus-visible:outline-none"
          :class="activeSection === section.id ? 'text-fg bg-bg-muted' : 'text-fg-subtle'"
        >
          <span class="flex items-center gap-2 min-w-0">
            <span
              :class="sectionMeta[section.id]?.icon"
              class="w-3.5 h-3.5 shrink-0"
              aria-hidden="true"
            />
            <span class="truncate">{{ sectionMeta[section.id]?.label }}</span>
          </span>
          <span class="text-fg-muted tabular-nums shrink-0">{{
            sectionMeta[section.id]?.count
          }}</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
