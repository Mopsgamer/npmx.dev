<script setup lang="ts">
import type { SizeEntry } from '~/types/size'

const { viewMode } = usePackageListPreferences()

definePageMeta({
  name: 'package-sizes',
  path: '/package-sizes/:org?/:packageName/v/:version',
})

const { t } = useI18n()
const route = useRoute('package-sizes')

const packageName = computed(() =>
  route.params.org
    ? `${route.params.org}/${route.params.packageName}`
    : (route.params.packageName as string),
)
const version = computed(() => route.params.version as string)

const isScrolled = ref(false)
const { y } = useWindowScroll()

watch([y, () => tableData.value.length, viewMode], ([newY, count, mode]) => {
  if (mode !== 'table' && mode !== 'cards') {
    isScrolled.value = false
    return
  }
  const threshold = mode === 'table' ? 8 : 3
  isScrolled.value = newY > 0 && count >= threshold
})

// Fetch total install size
const {
  data: installSize,
  status: installSizeStatus,
  refresh,
} = usePackageSize(packageName, version)

const sortColumn = ref<keyof SizeEntry>('selfSize')
const sortDir = ref<'asc' | 'desc'>('desc')

function compare(a: SizeEntry, b: SizeEntry) {
  let comparison = 0
  const col = sortColumn.value

  if (col === 'name' || col === 'version') {
    comparison = String(a[col]).localeCompare(String(b[col]))
  } else {
    const aVal = a[col] as number
    const bVal = b[col] as number
    comparison = aVal - bVal
  }

  return sortDir.value === 'asc' ? comparison : -comparison
}

const tableData = computed(() => {
  if (!installSize.value) return []

  const entries: SizeEntry[] = []

  // Add dependencies
  if (installSize.value.dependencies) {
    for (const dep of installSize.value.dependencies) {
      entries.push({
        name: dep.name,
        version: dep.version,
        selfSize: dep.size,
        totalSize: dep.totalSize ?? NaN,
        depCount: dep.dependencyCount ?? NaN,
        percentage: (dep.size / installSize.value.totalSize) * 100,
      })
    }
  }

  entries.sort(compare)

  return entries
})

useSeoMeta({
  title: () => `Sizes - ${packageName.value} - npmx`,
  description: () => `Dependency sizes for ${packageName.value}@${version.value}`,
})

const numberFormatter = useNumberFormatter()
const bytesFormatter = useBytesFormatter()
</script>

<template>
  <main class="container flex-1 pb-12 sm:pb-16 w-full px-0 sm:px-0 relative">
    <!-- Static Title Section (Scrolls away naturally) -->
    <div v-if="!isScrolled" class="max-w-4xl mx-auto px-4 sm:px-8 pt-12 sm:pt-16 mb-8">
      <div class="flex items-center justify-between gap-4 mb-4">
        <h1 class="font-mono text-3xl sm:text-4xl font-medium">
          {{ t('package.sizes.title') }}
        </h1>
        <div class="flex items-center gap-4">
          <ViewModeToggle v-model="viewMode" />
          <BackButton />
        </div>
      </div>
    </div>

    <header
      class="sticky top-[55px] z-20 border-b transition-all duration-300"
      :class="
        isScrolled
          ? 'bg-bg/80 backdrop-blur-md pt-2 pb-2 border-border/50 shadow-sm'
          : 'pt-4 pb-8 border-transparent'
      "
    >
      <div class="max-w-4xl mx-auto px-4 sm:px-8">
        <div
          v-if="installSize"
          class="flex transition-all duration-300"
          :class="isScrolled ? 'flex-row items-center gap-6' : 'flex-col gap-6'"
        >
          <!-- Main Info Row -->
          <div
            class="flex flex-1 transition-all duration-300 min-w-0"
            :class="isScrolled ? 'flex-row items-center gap-6' : 'flex-col gap-6'"
          >
            <!-- Package Identifier -->
            <div
              class="flex items-center gap-2 text-fg-muted font-mono transition-all duration-300 shrink-0"
              :class="isScrolled ? 'text-xs' : 'text-lg'"
            >
              <LinkBase
                :to="packageRoute(packageName, version)"
                class="hover:text-accent transition-colors"
              >
                {{ packageName }}
              </LinkBase>
              <span>@</span>
              <span>{{ version }}</span>
            </div>

            <!-- Stats Group -->
            <div
              class="flex transition-all duration-300 shrink-0"
              :class="isScrolled ? 'items-center gap-4' : 'grid grid-cols-1 sm:grid-cols-3 gap-8'"
            >
              <!-- Self Size -->
              <div class="flex" :class="isScrolled ? 'items-center gap-2' : 'flex-col'">
                <div
                  class="text-fg-subtle uppercase tracking-wider transition-all duration-300"
                  :class="isScrolled ? 'text-4xs' : 'text-xs mb-2'"
                >
                  {{ isScrolled ? 'Self' : t('package.sizes.columns.self_size') }}
                </div>
                <div
                  class="font-mono font-medium transition-all duration-300"
                  :class="isScrolled ? 'text-xs' : 'text-3xl'"
                >
                  {{ bytesFormatter.format(installSize.selfSize) }}
                </div>
              </div>

              <!-- Total Size -->
              <div class="flex" :class="isScrolled ? 'items-center gap-2' : 'flex-col'">
                <div
                  class="text-fg-subtle uppercase tracking-wider transition-all duration-300"
                  :class="isScrolled ? 'text-4xs' : 'text-xs mb-2'"
                >
                  {{ isScrolled ? 'Total' : t('package.stats.install_size') }}
                </div>
                <div
                  class="font-mono font-medium transition-all duration-300"
                  :class="isScrolled ? 'text-xs' : 'text-3xl'"
                >
                  {{ bytesFormatter.format(installSize.totalSize) }}
                </div>
              </div>

              <!-- Deps -->
              <div class="flex" :class="isScrolled ? 'items-center gap-2' : 'flex-col'">
                <div
                  class="text-fg-subtle uppercase tracking-wider transition-all duration-300"
                  :class="isScrolled ? 'text-4xs' : 'text-xs mb-2'"
                >
                  {{ isScrolled ? 'Deps' : t('package.stats.deps') }}
                </div>
                <div class="flex items-center" :class="isScrolled ? 'gap-1' : 'gap-3'">
                  <span
                    v-if="!isScrolled"
                    class="i-lucide:boxes text-fg-muted w-6 h-6"
                    aria-hidden="true"
                  />
                  <div
                    class="font-mono font-medium transition-all duration-300"
                    :class="isScrolled ? 'text-xs' : 'text-3xl'"
                  >
                    {{ numberFormatter.format(installSize.dependencyCount) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Size Bar -->
            <PackageSizeBar
              :package-name="packageName"
              :version="version"
              :package-size="installSize"
              class="transition-all duration-300 min-w-[100px]"
              :class="isScrolled ? 'flex-1' : 'w-full'"
              :height="isScrolled ? 'h-6' : 'h-10'"
            />

            <!-- Scrolled Controls (Only visible when scrolled) -->
            <div v-if="isScrolled" class="flex items-center gap-3 shrink-0">
              <ViewModeToggle v-model="viewMode" size="xs" />
              <BackButton size="xs" />
            </div>
          </div>
        </div>

        <!-- Skeleton Loading State -->
        <div v-else-if="installSizeStatus === 'pending'" class="flex-1 space-y-8">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div v-for="i in 3" :key="i">
              <div class="h-3 w-16 bg-bg-elevated animate-pulse rounded mb-3" />
              <div class="h-8 w-24 bg-bg-elevated animate-pulse rounded" />
            </div>
          </div>
          <div class="h-10 w-full bg-bg-elevated animate-pulse rounded-md" />
        </div>
      </div>
    </header>

    <div class="max-w-4xl mx-auto px-4 sm:px-8">
      <section v-if="tableData.length > 0 || installSizeStatus === 'pending'">
        <PackageSizeList
          :entries="tableData"
          :view-mode="viewMode"
          v-model:sort-column="sortColumn"
          v-model:sort-dir="sortDir"
          :is-loading="installSizeStatus === 'pending'"
          :is-scrolled="isScrolled"
          :sticky-offset="isScrolled ? 112 : 260"
        />
      </section>

      <section v-else-if="installSizeStatus === 'success'" class="py-20 text-center">
        <div
          class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-bg-elevated mb-4"
        >
          <span class="i-lucide:package-check w-8 h-8 text-fg-muted" />
        </div>
        <p class="text-fg-muted">{{ t('package.dependencies.empty') }}</p>
      </section>

      <section v-else-if="installSizeStatus === 'error'" class="py-20 text-center">
        <p class="text-fg-muted">{{ t('compare.packages.error') }}</p>
        <ButtonBase variant="secondary" class="mt-4" @click="refresh">
          {{ t('common.retry') }}
        </ButtonBase>
      </section>
    </div>
  </main>
</template>
