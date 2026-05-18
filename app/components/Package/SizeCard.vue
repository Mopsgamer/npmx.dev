<script setup lang="ts">
import type { SizeEntry } from '~/types/size'
import { getSizeRoute, packageRoute } from '~/utils/router'

const props = defineProps<{
  entry: SizeEntry
}>()

const { t } = useI18n()
const numberFormatter = useNumberFormatter()
const bytesFormatter = useBytesFormatter()

const target = useTemplateRef('target')
const targetIsVisible = shallowRef(false)

const { stop } = useIntersectionObserver(target, ([entry]) => {
  if ((targetIsVisible.value = entry?.isIntersecting || false)) stop()
})

const isSizeUnknown = computed(() => Number.isNaN(props.entry.totalSize))

const { data: fetchedSize, execute } = usePackageSize(
  () => props.entry.name,
  () => props.entry.version,
  { immediate: false },
)

watch(targetIsVisible, visible => {
  if (visible) execute()
})

const displayTotalSize = computed(() => {
  if (!isSizeUnknown.value) return props.entry.totalSize
  return fetchedSize.value?.totalSize ?? NaN
})

const displayDepCount = computed(() => {
  if (!isSizeUnknown.value) return props.entry.depCount
  return fetchedSize.value?.dependencies?.length ?? props.entry.depCount
})

const packageSizeData = computed(() => {
  return (
    fetchedSize.value || {
      package: props.entry.name,
      version: props.entry.version,
      selfSize: props.entry.selfSize,
      totalSize: displayTotalSize.value,
      dependencyCount: displayDepCount.value,
      dependencies: [],
    }
  )
})
</script>

<template>
  <div ref="target">
    <BaseCard>
      <header class="mb-4 flex items-baseline justify-between gap-2">
        <h3
          class="font-mono text-sm sm:text-base font-medium text-fg group-hover:text-fg transition-colors duration-200 min-w-0 break-all"
        >
          <NuxtLink
            :to="packageRoute(entry.name, entry.version)"
            class="decoration-none after:content-[''] after:absolute after:inset-0"
            dir="ltr"
            >{{ entry.name }}</NuxtLink
          >
        </h3>

        <LinkBase
          variant="button-secondary"
          size="sm"
          :to="getSizeRoute(entry.name, entry.version)"
          classicon="i-lucide:package-open"
          class="relative z-10 whitespace-nowrap gap-2 px-3 py-1.5"
        >
          <span class="text-xs font-medium">{{ t('package.stats.view_all_sizes') }}</span>
        </LinkBase>
      </header>

      <div class="flex flex-col sm:flex-row sm:justify-start sm:items-start gap-6 sm:gap-8">
        <div class="min-w-0 w-full">
          <!-- Version -->
          <div class="text-xs text-fg-subtle font-mono mb-2 sm:mb-3">v{{ entry.version }}</div>
          <!-- Stats row -->
          <div class="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-2 text-xs text-fg-muted">
            <dl class="flex items-center gap-4 m-0">
              <!-- Self size -->
              <div class="flex items-center gap-1.5">
                <dt class="sr-only">{{ t('package.sizes.columns.self_size') }}</dt>
                <dd class="font-mono">{{ bytesFormatter.format(entry.selfSize) }}</dd>
              </div>

              <!-- Total size -->
              <div class="flex items-center gap-1.5">
                <dt class="sr-only">{{ t('package.stats.install_size') }}</dt>
                <dd class="font-mono">
                  <template v-if="!Number.isNaN(displayTotalSize)">
                    {{
                      t('package.stats.size.total', {
                        size: bytesFormatter.format(displayTotalSize),
                      })
                    }}
                  </template>
                  <div
                    v-else-if="targetIsVisible"
                    class="inline-block w-3 h-3 border-2 border-fg-muted/20 border-t-accent rounded-full animate-spin"
                    aria-hidden="true"
                  />
                </dd>
              </div>

              <!-- Dep count -->
              <div class="flex items-center gap-1.5">
                <dt class="sr-only">{{ t('package.stats.deps') }}</dt>
                <dd class="flex items-center gap-1.5">
                  <span class="i-lucide:network w-3.5 h-3.5" aria-hidden="true" />
                  <template v-if="!Number.isNaN(displayTotalSize)">
                    <span class="font-mono">{{ numberFormatter.format(displayDepCount) }}</span>
                  </template>
                  <div
                    v-else-if="targetIsVisible"
                    class="inline-block w-3 h-3 border-2 border-fg-muted/20 border-t-accent rounded-full animate-spin"
                    aria-hidden="true"
                  />
                </dd>
              </div>

              <!-- Percentage -->
              <div v-if="entry.percentage" class="flex items-center gap-1.5">
                <dt class="sr-only">{{ t('package.sizes.columns.percentage') }}</dt>
                <dd class="font-mono">{{ numberFormatter.format(entry.percentage) }}%</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <!-- Size bar -->
      <div v-if="!Number.isNaN(displayTotalSize)" class="mt-3 pt-3 border-t border-border">
        <PackageSizeBar
          :package-name="entry.name"
          :version="entry.version"
          :package-size="packageSizeData"
        />
      </div>
    </BaseCard>
  </div>
</template>
