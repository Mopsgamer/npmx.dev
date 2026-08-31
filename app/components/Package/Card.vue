<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { StructuredFilters } from '#shared/types/preferences'
import {
  getOutdatedTooltip,
  getVersionClass,
  getVulnerableDepInfo,
  getDeprecatedDepInfo,
} from '~/utils/npm/problematic-dependencies'
import { normalizeDependencies } from '~/utils/npm/package-dependency-sections'
import type { PackageDependencyInsights } from '~/composables/usePackageDependencyInsights'

const props = defineProps<{
  /** The search result object containing package data */
  result: NpmSearchResult
  /** Heading level for the package name (h2 for search, h3 for lists) */
  headingLevel?: 'h2' | 'h3'
  /** Whether to show the publisher username */
  showPublisher?: boolean
  prefetch?: boolean
  index?: number
  /** Filters to apply to the results */
  filters?: StructuredFilters
  /** Search query for highlighting exact matches */
  searchQuery?: string
  /** Optional pre-computed insights to avoid duplicate fetching/processing */
  insights?: PackageDependencyInsights
  /** Version by default, adds "v" prefix. */
  versionIsRange?: boolean
  to?: RouteLocationRaw | string
}>()

const { selectable } = usePackageSelectionContext()
const { isPackageSelected, togglePackageSelection, canSelectMore } = usePackageSelection()
const isSelected = computed<boolean>(() => {
  return isPackageSelected(props.result.package.name)
})

const emit = defineEmits<{
  clickKeyword: [keyword: string]
}>()

/** Check if this package is an exact match for the search query */
const packageUrl = computed(() => props.to ?? packageRoute(props.result.package.name))

const isExactMatch = computed(() => {
  if (!props.searchQuery) return false
  const query = props.searchQuery.trim().toLowerCase()
  const name = props.result.package.name.toLowerCase()
  return query === name
})

// Process package description
const pkgDescription = useMarkdown(() => ({
  text: props.result.package.description ?? '',
  plain: true,
}))

const dependencies = computed(() => {
  if (!props.result.package.name || !props.result.package.version) return undefined
  return normalizeDependencies({ [props.result.package.name]: props.result.package.version })
})

const insights =
  props.insights ||
  usePackageDependencyInsights(
    computed(() => props.result.package.name),
    computed(() => props.result.package.version),
    dependencies,
  )

const vulnDepInfo = computed(() =>
  getVulnerableDepInfo(props.result.package.name, insights.vulnTree.value),
)
const deprDepInfo = computed(() =>
  getDeprecatedDepInfo(props.result.package.name, insights.vulnTree.value),
)

// Any insights such as vulnerabilities and replacements
const hasExtra = computed(
  () =>
    !!insights.outdatedDeps.value[props.result.package.name] ||
    !!insights.replacementDeps.value[props.result.package.name] ||
    !!vulnDepInfo.value ||
    !!deprDepInfo.value,
)

const numberFormatter = useNumberFormatter()
</script>

<template>
  <BaseCard :selected="isSelected" :isExactMatch="isExactMatch">
    <header class="mb-4 flex items-baseline justify-between gap-2">
      <component
        :is="headingLevel ?? 'h3'"
        class="font-mono text-sm sm:text-base font-medium text-fg group-hover:text-fg transition-colors duration-200 min-w-0 break-all inline-flex items-center gap-2"
      >
        <NuxtLink
          :to="packageUrl"
          :prefetch-on="prefetch ? 'visibility' : 'interaction'"
          class="decoration-none hover:text-accent-fallback"
          :data-result-index="index"
          dir="ltr"
          >{{ result.package.name }}</NuxtLink
        >
        <slot name="status-indicators" :insights="insights">
          <DependenciesStatusIndicators :name="result.package.name" :insights="insights" />
        </slot>
        <span
          v-if="isExactMatch"
          class="text-xs px-1.5 py-0.5 ms-2 rounded bg-bg-elevated border border-border-hover text-fg"
          >{{ $t('search.exact_match') }}</span
        >
      </component>

      <PackageSelectionCheckbox
        v-if="selectable"
        :package-name="result.package.name"
        :disabled="!canSelectMore && !isSelected"
        :checked="isSelected"
        @change="togglePackageSelection"
      />
    </header>

    <p v-if="pkgDescription" class="text-fg-muted text-xs sm:text-sm line-clamp-2 mb-2 sm:mb-3">
      <span v-html="pkgDescription" />
    </p>
    <div class="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-2 text-xs text-fg-muted">
      <ProvenanceBadge
        v-if="result.package.publisher?.trustedPublisher"
        :provider="result.package.publisher.trustedPublisher.id"
        :package-name="result.package.name"
        :version="result.package.version"
        :linked="false"
        compact
      />
      <dl class="contents m-0">
        <div v-if="result.package.version" class="flex items-center gap-1.5 min-w-0">
          <dt class="sr-only">{{ $t('package.card.version') }}</dt>
          <dd class="font-mono truncate max-w-32" :title="result.package.version">
            {{ versionIsRange ? '' : 'v' }}{{ result.package.version }}
          </dd>
        </div>
        <div v-if="result.package.date" class="flex items-center gap-1.5">
          <dt class="sr-only">{{ $t('package.card.published') }}</dt>
          <dd>
            <DateTime :datetime="result.package.date" year="numeric" month="short" day="numeric" />
          </dd>
        </div>
        <div
          v-if="showPublisher && result.package.publisher?.username"
          class="flex items-center gap-1.5"
        >
          <dt class="sr-only">{{ $t('package.card.publisher') }}</dt>
          <dd class="font-mono">{{ result.package.publisher.username }}</dd>
        </div>
        <div v-if="result.package.license" class="flex items-center gap-1.5">
          <dt class="sr-only">{{ $t('package.card.license') }}</dt>
          <dd>{{ result.package.license }}</dd>
        </div>
        <div v-if="result.downloads?.weekly != null" class="flex items-center gap-1.5 sm:ms-auto">
          <dt class="sr-only">{{ $t('package.card.weekly_downloads') }}</dt>
          <dd class="flex items-center gap-1.5">
            <span class="i-lucide:chart-line w-3.5 h-3.5" aria-hidden="true" />
            <span class="font-mono">
              {{ $n(result.downloads.weekly) }} {{ $t('common.per_week') }}
            </span>
          </dd>
        </div>
      </dl>
    </div>

    <ul
      role="list"
      v-if="result.package.keywords?.length"
      :aria-label="$t('package.card.keywords')"
      class="relative z-10 flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border list-none m-0 p-0 pointer-events-none items-center"
    >
      <li v-for="keyword in result.package.keywords.slice(0, 5)" :key="keyword">
        <ButtonBase
          class="pointer-events-auto"
          size="sm"
          :aria-pressed="props.filters?.keywords.includes(keyword)"
          :title="`Filter by ${keyword}`"
          @click.stop="emit('clickKeyword', keyword)"
        >
          {{ keyword }}
        </ButtonBase>
      </li>
      <li>
        <span
          v-if="result.package.keywords.length > 5"
          class="text-fg-subtle text-xs pointer-events-auto"
          :title="result.package.keywords.slice(5).join(', ')"
        >
          +{{ numberFormatter.format(result.package.keywords.length - 5) }}
        </span>
      </li>
    </ul>

    <div
      v-if="hasExtra"
      class="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border relative z-10"
    >
      <div class="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs shrink-0">
        <span
          v-if="insights.outdatedDeps.value[result.package.name]"
          class="flex items-center gap-1"
          :class="getVersionClass(result.package.name, insights)"
        >
          <span class="i-lucide:arrow-up w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          {{ getOutdatedTooltip(insights.outdatedDeps.value[result.package.name]!, $t) }}
        </span>
        <span
          v-if="insights.replacementDeps.value[result.package.name]"
          class="flex items-center gap-1 text-amber-700 dark:text-amber-500"
        >
          <span class="i-lucide:lightbulb w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          {{ $t('package.dependencies.has_replacement') }}
        </span>
        <LinkBase
          v-if="vulnDepInfo"
          :to="packageRoute(result.package.name, vulnDepInfo!.version)"
          class="flex items-center gap-1 shrink-0"
          :class="SEVERITY_TEXT_COLORS[getHighestSeverity(vulnDepInfo!.counts)]"
        >
          <span class="i-lucide:shield-alert w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          {{ $t('package.dependencies.view_vulnerabilities') }}
        </LinkBase>
        <LinkBase
          v-if="deprDepInfo"
          :to="packageRoute(result.package.name, deprDepInfo!.version)"
          class="flex items-center gap-1 shrink-0 text-purple-700 dark:text-purple-500"
          :title="deprDepInfo!.message"
        >
          <span class="i-lucide:octagon-alert w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          {{ $t('package.deprecated.label') }}
        </LinkBase>
      </div>
    </div>

    <slot name="extra" />
  </BaseCard>
</template>
