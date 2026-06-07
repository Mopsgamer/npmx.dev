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
  showSkeleton: boolean
}>()

const insights = inject(packageDependencyInsightsKey)!

const { t } = useI18n()

const registryIcon = computed(() =>
  props.item.registry === 'jsr' ? 'i-simple-icons:jsr' : 'i-simple-icons:npm',
)
</script>

<template>
  <tr
    class="group relative border-b border-border hover:bg-bg-muted transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-fg focus-visible:ring-inset focus-visible:outline-none"
    tabindex="0"
  >
    <td class="py-2 px-3">
      <NuxtLink
        :to="packageRoute(item.name)"
        class="row-link font-mono text-sm text-fg hover:text-accent-fallback transition-colors duration-200 inline-flex items-center gap-2 min-w-0"
        dir="ltr"
      >
        <span :class="registryIcon" class="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span class="truncate">{{ item.name }}</span>
      </NuxtLink>
    </td>
    <td class="py-2 px-3 font-mono text-xs" dir="ltr">
      <div class="flex items-center gap-1 min-w-0">
        <TooltipApp
          v-if="insights.outdatedDeps.value[item.name]"
          class="shrink-0"
          :class="getVersionClass(insights.outdatedDeps.value[item.name])"
          :text="getOutdatedTooltip(insights.outdatedDeps.value[item.name]!, t)"
        >
          <span class="i-lucide:circle-alert w-3 h-3" aria-hidden="true" />
        </TooltipApp>
        <LinkBase
          :to="packageRoute(item.name, item.range)"
          class="truncate"
          :class="insights.getDepVersionClass(item.name)"
          :title="insights.getDepVersionTooltip(item.name, item.range)"
        >
          {{ item.range }}
        </LinkBase>
      </div>
    </td>
    <td class="py-2 px-3 text-end">
      <div class="flex items-center justify-end gap-1">
        <DependenciesFlags :flags="item.flags" />
        <LinkBase
          v-if="insights.getVulnerableDepInfo(item.name)"
          :to="packageRoute(item.name, insights.getVulnerableDepInfo(item.name)!.version)"
          class="shrink-0"
          :class="
            SEVERITY_TEXT_COLORS[
              getHighestSeverity(insights.getVulnerableDepInfo(item.name)!.counts)
            ]
          "
          classicon="i-lucide:shield-alert"
        />
      </div>
    </td>
  </tr>
</template>
