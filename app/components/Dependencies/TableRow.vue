<script setup lang="ts">
import type { PackageDependencyItem } from '#shared/types/package-dependencies'
import { packageDependencyInsightsKey } from '~/composables/packageDependencyInsightsKey'

const props = defineProps<{
  item: PackageDependencyItem
  showSkeleton: boolean
}>()

const item = computed(() => props.item)

const insights = inject(packageDependencyInsightsKey)!

const registryIcon = computed(() =>
  props.item.registry === 'jsr' ? 'i-simple-icons:jsr' : 'i-simple-icons:npm',
)

// Computes text color for the package link based on severity level
const packageTextColorClass = computed(() => {
  const dependencyName = item.name
  if (insights.getVulnerableDepInfo(dependencyName)) return 'text-red-600'
  if (insights.getDeprecatedDepInfo(dependencyName)) return 'text-purple-700 dark:text-purple-500'
  if (insights.replacementDeps.value[dependencyName]) return 'text-amber-700 dark:text-amber-500'

  return 'text-fg hover:text-accent-fallback'
})
</script>

<template>
  <tr
    class="group relative border-b border-border hover:bg-bg-muted transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-fg focus-visible:ring-inset focus-visible:outline-none"
    tabindex="0"
  >
    <td class="py-2 px-3">
      <NuxtLink
        :to="packageRoute(item.name)"
        class="row-link font-mono text-sm transition-colors duration-200 inline-flex items-center gap-1.5 min-w-0"
        :class="packageTextColorClass"
        dir="ltr"
      >
        <span :class="registryIcon" class="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span class="whitespace-nowrap">{{ item.name }}</span>

        <!-- Clean status component encapsulation -->
        <DependenciesStatusIndicators :name="item.name" :flags="item.flags" />
      </NuxtLink>
    </td>
    <td class="py-2 px-3 font-mono text-xs text-end" dir="ltr">
      <TooltipApp
        :text="insights.getDepVersionTooltip(item.name, item.range)"
        class="inline-flex items-center gap-1 max-w-full justify-end"
      >
        <span
          v-if="insights.outdatedDeps.value[item.name]"
          class="i-lucide:arrow-up w-3 h-3 shrink-0"
          :class="insights.getDepVersionClass(item.name)"
          aria-hidden="true"
        />
        <LinkBase
          :to="packageRoute(item.name, item.range)"
          class="whitespace-nowrap hover:underline font-mono"
          :class="insights.getDepVersionClass(item.name)"
        >
          {{ item.range }}
        </LinkBase>
      </TooltipApp>
    </td>
  </tr>
</template>
