<script setup lang="ts">
import type { PackageDependencySection } from '#shared/types/package-dependencies'
import type { PackageDependencyInsights } from '~/composables/usePackageDependencyInsights'
import { getVulnerableDepInfo, getDeprecatedDepInfo } from '~/utils/npm/problematic-dependencies'

const selectedInsights = defineModel<string[]>('selectedInsights', { default: () => [] })

function toggleInsight(id: string) {
  if (selectedInsights.value.includes(id)) {
    selectedInsights.value = selectedInsights.value.filter(i => i !== id)
  } else {
    selectedInsights.value = [...selectedInsights.value, id]
  }
}

const props = withDefaults(
  defineProps<{
    insights?: PackageDependencyInsights
    sections: PackageDependencySection[]
    showSkeleton: boolean
    packageName?: string
    interactive?: boolean
  }>(),
  {
    interactive: true,
  },
)

const stats = computed(() => {
  const urgent = { major: 0, minor: 0, patch: 0, vulnerable: 0, deprecated: 0, replacement: 0 }
  const nonUrgent = { major: 0, minor: 0, patch: 0, vulnerable: 0, deprecated: 0, replacement: 0 }

  if (!props.insights) return { urgent, nonUrgent }

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
      const realName = item.packageName || item.name
      if (getVulnerableDepInfo(realName, props.insights.vulnTree.value)) target.vulnerable++
      if (getDeprecatedDepInfo(realName, props.insights.vulnTree.value)) target.deprecated++
    }
  }

  return { urgent, nonUrgent }
})

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

interface InsightMetric {
  id: string
  label: string
  icon: string
  iconColor: string
  loading: boolean
  urgentCount: number
  nonUrgentCount: number
}

const metrics = computed<InsightMetric[]>(() => [
  {
    id: 'major',
    label: $t('package.dependencies.insights.major_behind'),
    icon: 'i-lucide:arrow-up',
    iconColor: 'text-red-700 dark:text-red-500',
    loading: outdatedLoading.value,
    urgentCount: stats.value.urgent.major,
    nonUrgentCount: stats.value.nonUrgent.major,
  },
  {
    id: 'minor',
    label: $t('package.dependencies.insights.minor_behind'),
    icon: 'i-lucide:arrow-up',
    iconColor: 'text-orange-700 dark:text-orange-500',
    loading: outdatedLoading.value,
    urgentCount: stats.value.urgent.minor,
    nonUrgentCount: stats.value.nonUrgent.minor,
  },
  {
    id: 'patch',
    label: $t('package.dependencies.insights.patch_behind'),
    icon: 'i-lucide:arrow-up',
    iconColor: 'text-yellow-700 dark:text-yellow-500',
    loading: outdatedLoading.value,
    urgentCount: stats.value.urgent.patch,
    nonUrgentCount: stats.value.nonUrgent.patch,
  },
  {
    id: 'vulnerable',
    label: $t('package.dependencies.insights.vulnerable'),
    icon: 'i-lucide:shield-alert',
    iconColor: 'text-red-600',
    loading: vulnLoading.value,
    urgentCount: stats.value.urgent.vulnerable,
    nonUrgentCount: stats.value.nonUrgent.vulnerable,
  },
  {
    id: 'deprecated',
    label: $t('package.dependencies.insights.deprecated'),
    icon: 'i-lucide:octagon-alert',
    iconColor: 'text-purple-700 dark:text-purple-500',
    loading: vulnLoading.value,
    urgentCount: stats.value.urgent.deprecated,
    nonUrgentCount: stats.value.nonUrgent.deprecated,
  },
  {
    id: 'replacement',
    label: $t('package.dependencies.insights.replacements_available'),
    icon: 'i-lucide:lightbulb',
    iconColor: 'text-amber-700 dark:text-amber-500',
    loading: replacementLoading.value,
    urgentCount: stats.value.urgent.replacement,
    nonUrgentCount: stats.value.nonUrgent.replacement,
  },
])
</script>

<template>
  <section class="w-full py-4 mt-6">
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-1.5">
        <h2 class="text-fg-muted uppercase text-xs font-semibold tracking-wider">
          {{ $t('package.dependencies.insights.title') }}
        </h2>
        <TooltipApp
          :text="`${$t('package.dependencies.insights.subtitle')} — ${$t('package.dependencies.insights.tooltip_urgent')} / ${$t('package.dependencies.insights.tooltip_other')}`"
          position="bottom"
        >
          <button
            type="button"
            class="inline-flex items-center cursor-help text-fg-subtle hover:text-fg p-0.5 rounded"
            :aria-label="$t('package.dependencies.insights.title')"
          >
            <span class="i-lucide:info w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </TooltipApp>
      </div>

      <button
        v-if="interactive && selectedInsights.length > 0"
        type="button"
        class="inline-flex items-center gap-1 text-xs text-fg-subtle hover:text-fg font-mono transition-colors duration-200 cursor-pointer"
        @click="selectedInsights = []"
      >
        <span class="i-lucide:x w-3 h-3" aria-hidden="true" />
        <span>{{ $t('filters.clear_all') }}</span>
      </button>
    </div>

    <div
      class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-y-3 gap-x-4 border-y-border border-y py-3"
    >
      <component
        :is="interactive ? 'button' : 'div'"
        v-for="item in metrics"
        :key="item.id"
        :type="interactive ? 'button' : undefined"
        class="py-1.5 px-2 rounded-md text-start transition-colors duration-200"
        :class="[
          interactive
            ? 'focus-visible:(outline-2 outline-accent/70 outline-offset-1) hover:bg-bg-subtle cursor-pointer'
            : '',
          interactive && selectedInsights.includes(item.id)
            ? 'bg-bg-muted ring-1 ring-border-hover'
            : '',
        ]"
        :aria-pressed="interactive ? selectedInsights.includes(item.id) : undefined"
        :aria-label="
          interactive
            ? selectedInsights.includes(item.id)
              ? $t('package.dependencies.insights.clear_filter', { filter: item.label })
              : $t('package.dependencies.insights.filter_by', { filter: item.label })
            : undefined
        "
        @click="interactive ? toggleInsight(item.id) : undefined"
      >
        <span class="text-xs text-fg-muted lowercase flex items-center gap-1.5 truncate">
          <span class="truncate">{{ item.label }}</span>
          <span :class="[item.icon, item.iconColor, 'w-3.5 h-3.5 shrink-0']" aria-hidden="true" />
        </span>
        <span class="text-sm font-mono mt-1 block">
          <template v-if="showSkeleton || item.loading">
            <span
              aria-hidden="true"
              class="block w-4 h-4 border-2 border-fg-subtle border-t-fg rounded-full motion-safe:animate-spin"
            />
          </template>
          <template v-else>
            <span class="flex items-baseline gap-1">
              <span
                class="tabular-nums"
                :class="item.urgentCount > 0 ? 'text-fg font-medium' : 'text-fg-subtle'"
              >
                {{ item.urgentCount }}
              </span>
              <span class="text-fg-subtle px-0.5">/</span>
              <span
                class="tabular-nums"
                :class="item.nonUrgentCount > 0 ? 'text-fg-muted' : 'text-fg-subtle'"
              >
                {{ item.nonUrgentCount }}
              </span>
            </span>
          </template>
        </span>
      </component>
    </div>
  </section>
</template>
