<script setup lang="ts">
import type { PackageDependencyItem } from '#shared/types/package-dependencies'
import {
  SEVERITY_TEXT_COLORS,
  getHighestSeverity,
} from '~/composables/usePackageDependencyInsights'
import { packageDependencyInsightsKey } from '~/composables/packageDependencyInsightsKey'
import { getOutdatedTooltip, getVersionClass } from '~/utils/npm/outdated-dependencies'

const props = defineProps<{
  item: PackageDependencyItem
}>()

const insights = inject(packageDependencyInsightsKey)!

const registryIcon = computed(() =>
  props.item.registry === 'jsr' ? 'i-simple-icons:jsr' : 'i-simple-icons:npm',
)
</script>

<template>
  <BaseCard>
    <header class="mb-3 flex items-start justify-between gap-2">
      <h3 class="font-mono text-sm font-medium text-fg min-w-0 flex items-center gap-2 m-0">
        <span
          :class="registryIcon"
          class="w-4 h-4 shrink-0"
          :title="item.registry"
          aria-hidden="true"
        />
        <NuxtLink
          :to="packageRoute(item.name)"
          class="decoration-none after:content-[''] after:absolute after:inset-0 truncate"
          dir="ltr"
        >
          {{ item.name }}
        </NuxtLink>
      </h3>
      <DependenciesFlags :flags="item.flags" />
    </header>

    <div class="flex items-center justify-between gap-2" dir="ltr">
      <span class="flex items-center gap-1 min-w-0">
        <TooltipApp
          v-if="insights.outdatedDeps.value[item.name]"
          class="shrink-0"
          :class="getVersionClass(insights.outdatedDeps.value[item.name])"
          :text="getOutdatedTooltip(insights.outdatedDeps.value[item.name]!, $t)"
        >
          <span class="i-lucide:circle-alert w-3 h-3" aria-hidden="true" />
        </TooltipApp>
        <TooltipApp
          v-if="insights.replacementDeps.value[item.name]"
          class="shrink-0 text-amber-700 dark:text-amber-500"
          :text="$t('package.dependencies.has_replacement')"
        >
          <span class="i-lucide:lightbulb w-3 h-3" aria-hidden="true" />
        </TooltipApp>
        <LinkBase
          v-if="insights.getVulnerableDepInfo(item.name)"
          :to="packageRoute(item.name, insights.getVulnerableDepInfo(item.name)!.version)"
          class="shrink-0 relative z-10"
          :class="
            SEVERITY_TEXT_COLORS[
              getHighestSeverity(insights.getVulnerableDepInfo(item.name)!.counts)
            ]
          "
          classicon="i-lucide:shield-alert"
        >
          <span class="sr-only">{{ $t('package.dependencies.view_vulnerabilities') }}</span>
        </LinkBase>
        <LinkBase
          v-if="insights.getDeprecatedDepInfo(item.name)"
          :to="packageRoute(item.name, insights.getDeprecatedDepInfo(item.name)!.version)"
          class="shrink-0 relative z-10 text-purple-700 dark:text-purple-500"
          :title="insights.getDeprecatedDepInfo(item.name)!.message"
          classicon="i-lucide:octagon-alert"
        >
          <span class="sr-only">{{ $t('package.deprecated.label') }}</span>
        </LinkBase>
      </span>
      <LinkBase
        :to="packageRoute(item.name, item.range)"
        class="font-mono text-xs truncate max-w-[50%] relative z-10"
        :class="insights.getDepVersionClass(item.name)"
        :title="insights.getDepVersionTooltip(item.name, item.range)"
      >
        {{ item.range }}
      </LinkBase>
    </div>
  </BaseCard>
</template>
