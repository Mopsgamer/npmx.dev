<script setup lang="ts">
import type { PackageDependencyInsights } from '~/composables/usePackageDependencyInsights'
import { getVulnerableDepInfo, getDeprecatedDepInfo } from '~/utils/npm/problematic-dependencies'

const props = defineProps<{
  name: string
  packageName?: string
  flags?: string[]
  insights?: PackageDependencyInsights
}>()

const structuralMeta = computed<Record<string, { icon: string; text: string }>>(() => ({
  optional: { icon: 'i-lucide:circle-dashed', text: $t('package.dependencies.optional') },
  bundled: { icon: 'i-lucide:package', text: $t('package.dependencies.bundled') },
}))

const realPackageName = computed(() => props.packageName || props.name)

const healthStatusAlert = computed(() => {
  if (!props.name || !props.insights) return null

  if (getVulnerableDepInfo(realPackageName.value, props.insights.vulnTree.value))
    return {
      icon: 'i-lucide:shield-alert',
      cssClass: 'text-red-600',
      tooltipText: $t('package.dependencies.vulnerable'),
    }

  if (getDeprecatedDepInfo(realPackageName.value, props.insights.vulnTree.value))
    return {
      icon: 'i-lucide:octagon-alert',
      cssClass: 'text-purple-700 dark:text-purple-500',
      tooltipText: $t('package.deprecated.label'),
    }

  if (props.insights.replacementDeps?.value?.[props.name])
    return {
      icon: 'i-lucide:lightbulb',
      cssClass: 'text-amber-700 dark:text-amber-500',
      tooltipText: $t('package.dependencies.has_replacement'),
    }

  return null
})
</script>

<template>
  <div class="inline-flex items-center gap-1.5 shrink-0">
    <template v-for="attribute in flags" :key="attribute">
      <TooltipApp
        v-if="structuralMeta[attribute]"
        :text="structuralMeta[attribute].text"
        class="inline-flex shrink-0"
      >
        <span
          :class="structuralMeta[attribute].icon"
          class="w-3 h-3 text-fg-subtle"
          aria-hidden="true"
        />
      </TooltipApp>
    </template>

    <TooltipApp
      v-if="healthStatusAlert"
      :text="healthStatusAlert.tooltipText"
      class="inline-flex shrink-0"
    >
      <span
        :class="[healthStatusAlert.icon, healthStatusAlert.cssClass]"
        class="w-3.5 h-3.5"
        aria-hidden="true"
      />
    </TooltipApp>
  </div>
</template>
