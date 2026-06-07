<script setup lang="ts">
import type { PackageDependencySection } from '#shared/types/package-dependencies'
import { packageDependencyInsightsKey } from '~/composables/packageDependencyInsightsKey'

const props = defineProps<{
  sections: PackageDependencySection[]
}>()

const insights = inject(packageDependencyInsightsKey)!

const stats = computed(() => {
  const urgent = { major: 0, minor: 0, patch: 0, vulnerable: 0, deprecated: 0, replacement: 0 }
  const nonUrgent = { major: 0, minor: 0, patch: 0, vulnerable: 0, deprecated: 0, replacement: 0 }

  for (const section of props.sections) {
    const isUrgent = ['dependencies', 'bundledDependencies'].includes(section.id)
    const target = isUrgent ? urgent : nonUrgent

    for (const item of section.items) {
      const outdated = insights.outdatedDeps.value[item.name]
      if (outdated) {
        if (outdated.majorsBehind > 0) {
          target.major++
        } else if (outdated.minorsBehind > 0) {
          target.minor++
        } else {
          target.patch++
        }
      }

      if (insights.replacementDeps.value[item.name]) {
        target.replacement++
      }
      if (insights.getVulnerableDepInfo(item.name)) {
        target.vulnerable++
      }
      if (insights.getDeprecatedDepInfo(item.name)) {
        target.deprecated++
      }
    }
  }

  return { urgent, nonUrgent }
})
</script>

<template>
  <CollapsibleSection :title="$t('package.dependencies.insights') || 'Insights'" id="deps-insights">
    <div class="flex flex-col gap-3 font-mono text-xs">
      <div
        class="flex items-center justify-end text-3xs uppercase tracking-wider text-fg-subtle border-b border-border/40 pb-1"
      >
        <div class="w-16 text-end flex justify-end">
          <TooltipApp text="Production and bundled dependencies" position="bottom">
            <span class="font-semibold block cursor-help">Urgent</span>
          </TooltipApp>
        </div>
        <div class="w-16 text-end flex justify-end">
          <TooltipApp text="Dev, peer, and optional dependencies" position="bottom">
            <span class="block cursor-help">Other</span>
          </TooltipApp>
        </div>
      </div>

      <!-- Outdated Major -->
      <div class="flex items-center justify-between border-b border-border/40 pb-2">
        <span class="flex items-center gap-2 text-fg-subtle min-w-0 truncate">
          <span
            class="i-lucide:circle-alert w-3.5 h-3.5 text-red-700 dark:text-red-500 shrink-0"
            aria-hidden="true"
          />
          <span class="truncate">Major behind</span>
        </span>
        <div class="flex items-center gap-0">
          <span class="w-16 text-end font-bold text-fg tabular-nums">{{ stats.urgent.major }}</span>
          <span class="w-16 text-end text-fg-muted tabular-nums">{{ stats.nonUrgent.major }}</span>
        </div>
      </div>

      <!-- Outdated Minor -->
      <div class="flex items-center justify-between border-b border-border/40 pb-2">
        <span class="flex items-center gap-2 text-fg-subtle min-w-0 truncate">
          <span
            class="i-lucide:circle-alert w-3.5 h-3.5 text-orange-700 dark:text-orange-500 shrink-0"
            aria-hidden="true"
          />
          <span class="truncate">Minor behind</span>
        </span>
        <div class="flex items-center gap-0">
          <span class="w-16 text-end font-bold text-fg tabular-nums">{{ stats.urgent.minor }}</span>
          <span class="w-16 text-end text-fg-muted tabular-nums">{{ stats.nonUrgent.minor }}</span>
        </div>
      </div>

      <!-- Outdated Patch -->
      <div class="flex items-center justify-between border-b border-border/40 pb-2">
        <span class="flex items-center gap-2 text-fg-subtle min-w-0 truncate">
          <span
            class="i-lucide:circle-alert w-3.5 h-3.5 text-yellow-700 dark:text-yellow-500 shrink-0"
            aria-hidden="true"
          />
          <span class="truncate">Patch behind</span>
        </span>
        <div class="flex items-center gap-0">
          <span class="w-16 text-end font-bold text-fg tabular-nums">{{ stats.urgent.patch }}</span>
          <span class="w-16 text-end text-fg-muted tabular-nums">{{ stats.nonUrgent.patch }}</span>
        </div>
      </div>

      <!-- Vulnerable -->
      <div class="flex items-center justify-between border-b border-border/40 pb-2">
        <span class="flex items-center gap-2 text-fg-subtle min-w-0 truncate">
          <span
            class="i-lucide:shield-alert w-3.5 h-3.5 text-red-600 shrink-0"
            aria-hidden="true"
          />
          <span class="truncate">Vulnerable</span>
        </span>
        <div class="flex items-center gap-0">
          <span class="w-16 text-end font-bold text-fg tabular-nums">{{
            stats.urgent.vulnerable
          }}</span>
          <span class="w-16 text-end text-fg-muted tabular-nums">{{
            stats.nonUrgent.vulnerable
          }}</span>
        </div>
      </div>

      <!-- Deprecated -->
      <div class="flex items-center justify-between border-b border-border/40 pb-2">
        <span class="flex items-center gap-2 text-fg-subtle min-w-0 truncate">
          <span
            class="i-lucide:octagon-alert w-3.5 h-3.5 text-purple-700 dark:text-purple-500 shrink-0"
            aria-hidden="true"
          />
          <span class="truncate">Deprecated</span>
        </span>
        <div class="flex items-center gap-0">
          <span class="w-16 text-end font-bold text-fg tabular-nums">{{
            stats.urgent.deprecated
          }}</span>
          <span class="w-16 text-end text-fg-muted tabular-nums">{{
            stats.nonUrgent.deprecated
          }}</span>
        </div>
      </div>

      <!-- Replacements -->
      <div class="flex items-center justify-between pb-1">
        <span class="flex items-center gap-2 text-fg-subtle min-w-0 truncate">
          <span
            class="i-lucide:lightbulb w-3.5 h-3.5 text-amber-700 dark:text-amber-500 shrink-0"
            aria-hidden="true"
          />
          <span class="truncate">Replacements available</span>
        </span>
        <div class="flex items-center gap-0">
          <span class="w-16 text-end font-bold text-fg tabular-nums">{{
            stats.urgent.replacement
          }}</span>
          <span class="w-16 text-end text-fg-muted tabular-nums">{{
            stats.nonUrgent.replacement
          }}</span>
        </div>
      </div>
    </div>
  </CollapsibleSection>
</template>
