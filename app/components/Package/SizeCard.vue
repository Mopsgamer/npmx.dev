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
  if (visible && isSizeUnknown.value) {
    execute()
  }
})

const displayTotalSize = computed(() => {
  if (!isSizeUnknown.value) return props.entry.totalSize
  return fetchedSize.value?.totalSize ?? NaN
})

const displayDepCount = computed(() => {
  if (!isSizeUnknown.value) return props.entry.depCount
  return fetchedSize.value?.dependencies?.length ?? props.entry.depCount
})
</script>

<template>
  <div ref="target" class="p-4 border border-border rounded-lg bg-neutral-950/40 transition-colors">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-3 flex-wrap">
          <div class="flex-1 min-w-0">
            <LinkBase
              :to="packageRoute(entry.name, entry.version)"
              class="block truncate hover:text-accent transition-colors font-mono font-medium text-base"
              :title="entry.name"
            >
              {{ entry.name }}
            </LinkBase>
          </div>
          <LinkBase
            variant="button-secondary"
            size="sm"
            :to="getSizeRoute(entry.name, entry.version)"
            classicon="i-lucide:list-tree"
            class="whitespace-nowrap gap-2 px-3 py-1.5"
          >
            <span class="text-xs font-medium">{{ t('package.stats.view_all_sizes') }}</span>
          </LinkBase>
        </div>
        <div class="text-xs text-fg-subtle font-mono mt-1">
          {{ entry.version }}
        </div>
      </div>
      <div class="force-text-right">
        <div class="font-mono text-sm">{{ bytesFormatter.format(entry.selfSize) }}</div>
        <div class="text-xs text-fg-muted font-mono mt-1">
          <template v-if="!Number.isNaN(displayTotalSize)">
            {{
              t('package.stats.size.total', {
                size: bytesFormatter.format(displayTotalSize),
              })
            }}
          </template>

          <template v-else-if="targetIsVisible">
            <div
              class="w-3 h-3 border-2 border-fg-muted/20 border-t-accent rounded-full animate-spin"
              aria-hidden="true"
            />
          </template>
        </div>
      </div>
    </div>

    <div class="mt-4 flex items-center gap-4 text-sm">
      <div class="flex items-center gap-1.5 text-fg-muted">
        <span class="i-lucide:boxes w-4 h-4" aria-hidden="true" />
        <template v-if="!Number.isNaN(displayTotalSize)">
          <span>{{ numberFormatter.format(displayDepCount) }}</span>
        </template>
        <template v-else-if="targetIsVisible">
          <div
            class="w-3 h-3 border-2 border-fg-muted/20 border-t-accent rounded-full animate-spin"
            aria-hidden="true"
          />
        </template>
      </div>

      <div class="flex-1">
        <PackageSizeBar
          v-if="!Number.isNaN(displayTotalSize)"
          :package-name="entry.name"
          :version="entry.version"
          :package-size="
            fetchedSize || {
              package: entry.name,
              version: entry.version,
              selfSize: entry.selfSize,
              totalSize: displayTotalSize,
              dependencyCount: displayDepCount,
              dependencies: [],
            }
          "
        />
      </div>
    </div>
  </div>
</template>
