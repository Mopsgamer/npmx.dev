<script setup lang="ts">
import type { PackageDependencyItem } from '#shared/types/package-dependencies'
import {
  SEVERITY_TEXT_COLORS,
  getHighestSeverity,
} from '~/composables/usePackageDependencyInsights'
import { packageDependencyInsightsKey } from '~/composables/packageDependencyInsightsKey'
import { getOutdatedTooltip, getVersionClass } from '~/utils/npm/outdated-dependencies'
import { metaToSearchResult } from '~/composables/npm/search-utils'

const props = defineProps<{
  item: PackageDependencyItem
  showSkeleton: boolean
}>()

const insights = inject(packageDependencyInsightsKey)!

// Fetch rich package metadata from API
const { data: meta } = useLazyFetch<PackageMetaResponse>(
  () => `/api/registry/package-meta/${encodePackageName(props.item.name)}`,
  {
    server: false,
  },
)

const searchResult = computed(() => {
  if (!meta.value) return null
  const result = metaToSearchResult(meta.value)
  result.package.version = props.item.range
  return result
})
const hasExtra = computed(
  () =>
    props.item.flags.length > 0 ||
    !!insights.outdatedDeps.value[props.item.name] ||
    !!insights.replacementDeps.value[props.item.name] ||
    !!insights.getVulnerableDepInfo(props.item.name) ||
    !!insights.getDeprecatedDepInfo(props.item.name),
)
</script>

<template>
  <!-- Loading skeleton while meta is not yet available -->
  <BaseCard v-if="!searchResult || showSkeleton">
    <header class="mb-4 flex items-baseline justify-between gap-2">
      <h3 class="font-mono text-sm sm:text-base font-medium text-fg min-w-0 break-all">
        <NuxtLink
          :to="packageRoute(item.name)"
          class="decoration-none after:content-[''] after:absolute after:inset-0"
          dir="ltr"
        >
          {{ item.name }}
        </NuxtLink>
      </h3>
      <DependenciesFlags :flags="item.flags" />
    </header>
    <div class="h-4 bg-bg-elevated animate-pulse rounded max-w-md mb-2" />
    <div class="flex items-center gap-2 mt-1 text-xs text-fg-muted font-mono">
      <span>v{{ item.range }}</span>
    </div>
  </BaseCard>

  <!-- Full card using Package/Card as base -->
  <PackageCard v-else :result="searchResult">
    <template #extra>
      <div
        v-if="hasExtra"
        class="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border relative z-10"
      >
        <DependenciesFlags :flags="item.flags" />

        <!-- insights -->
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs shrink-0">
          <span
            v-if="insights.outdatedDeps.value[item.name]"
            class="flex items-center gap-1"
            :class="getVersionClass(insights.outdatedDeps.value[item.name])"
          >
            <span class="i-lucide:circle-alert w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {{ getOutdatedTooltip(insights.outdatedDeps.value[item.name]!, $t) }}
          </span>
          <span
            v-if="insights.replacementDeps.value[item.name]"
            class="flex items-center gap-1 text-amber-700 dark:text-amber-500"
          >
            <span class="i-lucide:lightbulb w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {{ $t('package.dependencies.has_replacement') }}
          </span>
          <LinkBase
            v-if="insights.getVulnerableDepInfo(item.name)"
            :to="packageRoute(item.name, insights.getVulnerableDepInfo(item.name)!.version)"
            class="flex items-center gap-1 shrink-0"
            :class="
              SEVERITY_TEXT_COLORS[
                getHighestSeverity(insights.getVulnerableDepInfo(item.name)!.counts)
              ]
            "
          >
            <span class="i-lucide:shield-alert w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {{ $t('package.dependencies.view_vulnerabilities') }}
          </LinkBase>
          <LinkBase
            v-if="insights.getDeprecatedDepInfo(item.name)"
            :to="packageRoute(item.name, insights.getDeprecatedDepInfo(item.name)!.version)"
            class="flex items-center gap-1 shrink-0 text-purple-700 dark:text-purple-500"
            :title="insights.getDeprecatedDepInfo(item.name)!.message"
          >
            <span class="i-lucide:octagon-alert w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {{ $t('package.deprecated.label') }}
          </LinkBase>
        </div>
      </div>
    </template>
  </PackageCard>
</template>
