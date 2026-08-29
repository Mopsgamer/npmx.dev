<script setup lang="ts">
import type { PackageDependencySection } from '#shared/types/package-dependencies'
import type { PackageDependencyInsights } from '~/composables/usePackageDependencyInsights'
import { getVulnerableDepInfo, getDeprecatedDepInfo } from '~/utils/npm/problematic-dependencies'
import { useRoute } from 'vue-router'

const props = defineProps<{
  insights?: PackageDependencyInsights
  sections: PackageDependencySection[]
  showSkeleton: boolean
  packageName?: string
}>()

const stats = computed(() => {
  const urgent = { major: 0, minor: 0, patch: 0, vulnerable: 0, deprecated: 0, replacement: 0 }
  const nonUrgent = { major: 0, minor: 0, patch: 0, vulnerable: 0, deprecated: 0, replacement: 0 }

  if (!props.insights) return { urgent, nonUrgent }

  // Check the package itself for vulnerabilities (depth: 'root')
  if (props.packageName) {
    if (getVulnerableDepInfo(props.packageName, props.insights.vulnTree.value)) {
      urgent.vulnerable++
    }
    if (getDeprecatedDepInfo(props.packageName, props.insights.vulnTree.value)) {
      urgent.deprecated++
    }
  }

  for (const section of props.sections) {
    const isUrgent = ['dependencies', 'bundledDependencies'].includes(section.id)
    const target = isUrgent ? urgent : nonUrgent

    for (const item of section.items) {
      const outdated = props.insights.outdatedDeps.value[item.name]
      if (outdated) {
        if (outdated.majorsBehind > 0) target.major++
        else if (outdated.minorsBehind > 0) target.minor++
        else target.patch++
      }

      if (props.insights.replacementDeps.value[item.name]) target.replacement++
      if (getVulnerableDepInfo(item.name, props.insights.vulnTree.value)) target.vulnerable++
      if (getDeprecatedDepInfo(item.name, props.insights.vulnTree.value)) target.deprecated++
    }
  }

  return { urgent, nonUrgent }
})

const route = useRoute()
const isStatsTab = computed(() => route.name === 'stats')

const vulnLoading = computed(
  () =>
    !props.insights ||
    props.insights.vulnStatus?.value === 'idle' ||
    props.insights.vulnStatus?.value === 'pending',
)
const outdatedLoading = computed(
  () =>
    !props.insights ||
    props.insights.outdatedStatus?.value === 'idle' ||
    props.insights.outdatedStatus?.value === 'pending',
)
const replacementLoading = computed(
  () =>
    !props.insights ||
    props.insights.replacementStatus?.value === 'idle' ||
    props.insights.replacementStatus?.value === 'pending',
)

function shouldShowRow(type: keyof typeof stats.value.urgent) {
  if (isStatsTab.value) return true
  return stats.value.urgent[type] > 0 || stats.value.nonUrgent[type] > 0
}
</script>

<template>
  <CollapsibleSection
    id="deps-insights"
    :title="$t('package.dependencies.insights.title')"
    :subtitle="$t('package.dependencies.insights.subtitle')"
  >
    <div v-if="showSkeleton" class="flex flex-col gap-4 py-2">
      <SkeletonBlock class="h-4 w-full" />
      <SkeletonBlock class="h-4 w-full" />
      <SkeletonBlock class="h-4 w-full" />
      <SkeletonBlock class="h-4 w-full" />
    </div>

    <div v-else class="overflow-x-auto">
      <div class="flex flex-col gap-3 font-mono text-xs min-w-max">
        <div
          class="flex items-center justify-end text-3xs uppercase tracking-wider text-fg-subtle border-b border-border/40 pb-1"
        >
          <div class="w-16 text-end flex justify-end">
            <TooltipApp text="Production and bundled dependencies" position="bottom">
              <span class="font-semibold flex items-center gap-1 cursor-help">
                Urgent
                <span class="i-lucide:info w-3 h-3 text-fg-subtle" aria-hidden="true" />
              </span>
            </TooltipApp>
          </div>
          <div class="w-16 text-end flex justify-end">
            <TooltipApp text="Dev, peer, and optional dependencies" position="bottom">
              <span class="flex items-center gap-1 cursor-help">
                Other
                <span class="i-lucide:info w-3 h-3 text-fg-subtle" aria-hidden="true" />
              </span>
            </TooltipApp>
          </div>
        </div>

        <!-- Outdated Major -->
        <div
          v-if="shouldShowRow('major')"
          class="flex items-center justify-between border-b border-border/40 pb-2"
        >
          <span class="flex items-center gap-2 text-fg-subtle whitespace-nowrap">
            <span
              class="i-lucide:arrow-up w-3.5 h-3.5 text-red-700 dark:text-red-500 shrink-0"
              aria-hidden="true"
            />
            <span class="whitespace-nowrap">Major behind</span>
          </span>
          <div class="flex items-center gap-0">
            <span class="w-16 text-end font-bold text-fg tabular-nums">
              <span
                v-if="outdatedLoading"
                class="inline-block w-3 h-3 border border-fg-subtle border-t-fg rounded-full motion-safe:animate-spin"
                aria-hidden="true"
              />
              <template v-else>{{ stats.urgent.major }}</template>
            </span>
            <span class="w-16 text-end text-fg-muted tabular-nums">
              <span
                v-if="outdatedLoading"
                class="inline-block w-3 h-3 border border-fg-subtle border-t-fg rounded-full motion-safe:animate-spin"
                aria-hidden="true"
              />
              <template v-else>{{ stats.nonUrgent.major }}</template>
            </span>
          </div>
        </div>

        <!-- Outdated Minor -->
        <div
          v-if="shouldShowRow('minor')"
          class="flex items-center justify-between border-b border-border/40 pb-2"
        >
          <span class="flex items-center gap-2 text-fg-subtle whitespace-nowrap">
            <span
              class="i-lucide:arrow-up w-3.5 h-3.5 text-orange-700 dark:text-orange-500 shrink-0"
              aria-hidden="true"
            />
            <span class="whitespace-nowrap">Minor behind</span>
          </span>
          <div class="flex items-center gap-0">
            <span class="w-16 text-end font-bold text-fg tabular-nums">
              <span
                v-if="outdatedLoading"
                class="inline-block w-3 h-3 border border-fg-subtle border-t-fg rounded-full motion-safe:animate-spin"
                aria-hidden="true"
              />
              <template v-else>{{ stats.urgent.minor }}</template>
            </span>
            <span class="w-16 text-end text-fg-muted tabular-nums">
              <span
                v-if="outdatedLoading"
                class="inline-block w-3 h-3 border border-fg-subtle border-t-fg rounded-full motion-safe:animate-spin"
                aria-hidden="true"
              />
              <template v-else>{{ stats.nonUrgent.minor }}</template>
            </span>
          </div>
        </div>

        <!-- Outdated Patch -->
        <div
          v-if="shouldShowRow('patch')"
          class="flex items-center justify-between border-b border-border/40 pb-2"
        >
          <span class="flex items-center gap-2 text-fg-subtle whitespace-nowrap">
            <span
              class="i-lucide:arrow-up w-3.5 h-3.5 text-yellow-700 dark:text-yellow-500 shrink-0"
              aria-hidden="true"
            />
            <span class="whitespace-nowrap">Patch behind</span>
          </span>
          <div class="flex items-center gap-0">
            <span class="w-16 text-end font-bold text-fg tabular-nums">
              <span
                v-if="outdatedLoading"
                class="inline-block w-3 h-3 border border-fg-subtle border-t-fg rounded-full motion-safe:animate-spin"
                aria-hidden="true"
              />
              <template v-else>{{ stats.urgent.patch }}</template>
            </span>
            <span class="w-16 text-end text-fg-muted tabular-nums">
              <span
                v-if="outdatedLoading"
                class="inline-block w-3 h-3 border border-fg-subtle border-t-fg rounded-full motion-safe:animate-spin"
                aria-hidden="true"
              />
              <template v-else>{{ stats.nonUrgent.patch }}</template>
            </span>
          </div>
        </div>

        <!-- Vulnerable -->
        <div
          v-if="shouldShowRow('vulnerable')"
          class="flex items-center justify-between border-b border-border/40 pb-2"
        >
          <span class="flex items-center gap-2 text-fg-subtle whitespace-nowrap">
            <span
              class="i-lucide:shield-alert w-3.5 h-3.5 text-red-600 shrink-0"
              aria-hidden="true"
            />
            <span class="whitespace-nowrap">Vulnerable</span>
          </span>
          <div class="flex items-center gap-0">
            <span class="w-16 text-end font-bold text-fg tabular-nums">
              <span
                v-if="vulnLoading"
                class="inline-block w-3 h-3 border border-fg-subtle border-t-fg rounded-full motion-safe:animate-spin"
                aria-hidden="true"
              />
              <template v-else>{{ stats.urgent.vulnerable }}</template>
            </span>
            <span class="w-16 text-end text-fg-muted tabular-nums">
              <span
                v-if="vulnLoading"
                class="inline-block w-3 h-3 border border-fg-subtle border-t-fg rounded-full motion-safe:animate-spin"
                aria-hidden="true"
              />
              <template v-else>{{ stats.nonUrgent.vulnerable }}</template>
            </span>
          </div>
        </div>

        <!-- Deprecated -->
        <div
          v-if="shouldShowRow('deprecated')"
          class="flex items-center justify-between border-b border-border/40 pb-2"
        >
          <span class="flex items-center gap-2 text-fg-subtle whitespace-nowrap">
            <span
              class="i-lucide:octagon-alert w-3.5 h-3.5 text-purple-700 dark:text-purple-500 shrink-0"
              aria-hidden="true"
            />
            <span class="whitespace-nowrap">Deprecated</span>
          </span>
          <div class="flex items-center gap-0">
            <span class="w-16 text-end font-bold text-fg tabular-nums">
              <span
                v-if="vulnLoading"
                class="inline-block w-3 h-3 border border-fg-subtle border-t-fg rounded-full motion-safe:animate-spin"
                aria-hidden="true"
              />
              <template v-else>{{ stats.urgent.deprecated }}</template>
            </span>
            <span class="w-16 text-end text-fg-muted tabular-nums">
              <span
                v-if="vulnLoading"
                class="inline-block w-3 h-3 border border-fg-subtle border-t-fg rounded-full motion-safe:animate-spin"
                aria-hidden="true"
              />
              <template v-else>{{ stats.nonUrgent.deprecated }}</template>
            </span>
          </div>
        </div>

        <!-- Replacements -->
        <div v-if="shouldShowRow('replacement')" class="flex items-center justify-between pb-1">
          <span class="flex items-center gap-2 text-fg-subtle whitespace-nowrap">
            <span
              class="i-lucide:lightbulb w-3.5 h-3.5 text-amber-700 dark:text-amber-500 shrink-0"
              aria-hidden="true"
            />
            <span class="whitespace-nowrap">Replacements available</span>
          </span>
          <div class="flex items-center gap-0">
            <span class="w-16 text-end font-bold text-fg tabular-nums">
              <span
                v-if="replacementLoading"
                class="inline-block w-3 h-3 border border-fg-subtle border-t-fg rounded-full motion-safe:animate-spin"
                aria-hidden="true"
              />
              <template v-else>{{ stats.urgent.replacement }}</template>
            </span>
            <span class="w-16 text-end text-fg-muted tabular-nums">
              <span
                v-if="replacementLoading"
                class="inline-block w-3 h-3 border border-fg-subtle border-t-fg rounded-full motion-safe:animate-spin"
                aria-hidden="true"
              />
              <template v-else>{{ stats.nonUrgent.replacement }}</template>
            </span>
          </div>
        </div>
      </div>
    </div>
  </CollapsibleSection>
</template>
