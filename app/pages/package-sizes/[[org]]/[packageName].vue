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

// Fetch total install size
const { data: size, pending: sizePending } = usePackageSize(packageName, version)

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

const dependencies = computed(() => size.value?.dependencies)

const { data: depsizes, pending: depsizesPending } = usePackageDependencySizes(
  packageName,
  version,
  dependencies,
)

const tableData = computed(() => {
  if (!size.value) return []
  if (!dependencies.value) return []

  const entries: SizeEntry[] = []

  // Add dependencies
  for (const dep of dependencies.value) {
    const serverData = depsizes.value?.[dep.name]
    const isSuccess = serverData?.kind === 'success'

    entries.push({
      name: dep.name,
      version: dep.version,
      selfSize: isSuccess && serverData.packageSize ? serverData.packageSize.selfSize : dep.size,
      totalSize:
        isSuccess && serverData.packageSize
          ? serverData.packageSize.totalSize
          : (dep.totalSize ?? NaN),
      depCount:
        isSuccess && serverData.packageSize
          ? serverData.packageSize.dependencyCount
          : (dep.dependencyCount ?? NaN),
      percentage: (dep.size / size.value.totalSize) * 100,
      installSize: isSuccess && serverData.packageSize ? serverData.packageSize : undefined,
    })
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
  <main class="container flex-1 py-12 sm:py-16 w-full">
    <article class="max-w-2xl mx-auto">
      <header class="mb-12">
        <div class="flex items-baseline justify-between gap-4 mb-4">
          <h1 class="font-mono text-3xl sm:text-4xl font-medium">
            {{ $t('package.sizes.title') }}
          </h1>
          <BackButton />
        </div>
        <p class="text-fg-muted text-lg">
          <LinkBase :to="packageRoute(packageName, version)">
            {{ packageName }}
          </LinkBase>
          <span>@</span>
          <span>{{ version }}</span>
        </p>

        <div v-if="!sizePending && size" class="flex flex-col gap-6 pt-12 sm:pt-16">
          <!-- Main Info Row -->
          <div class="flex flex-1 min-w-0 flex-col gap-6">
            <!-- Stats Group -->
            <div
              class="flex transition-all duration-300 shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-8"
            >
              <!-- Self Size -->
              <div class="flex flex-col">
                <div
                  class="text-fg-subtle text-xs mb-2 uppercase tracking-wider transition-all duration-300"
                >
                  {{ t('package.sizes.columns.self_size') }}
                </div>
                <div class="font-mono text-3xl font-medium transition-all duration-300">
                  {{ bytesFormatter.format(size.selfSize) }}
                </div>
              </div>

              <!-- Total Size -->
              <div class="flex flex-col">
                <div
                  class="text-fg-subtle text-xs mb-2 uppercase tracking-wider transition-all duration-300"
                >
                  {{ t('package.stats.install_size') }}
                </div>
                <div class="font-mono 'text-3xl font-medium transition-all duration-300">
                  {{ bytesFormatter.format(size.totalSize) }}
                </div>
              </div>

              <!-- Deps -->
              <div class="flex flex-col">
                <div
                  class="text-fg-subtle text-xs mb-2 uppercase tracking-wider transition-all duration-300"
                >
                  {{ t('package.stats.deps') }}
                </div>
                <div class="flex items-center gap-3">
                  <span class="i-lucide:network text-fg-muted w-6 h-6" aria-hidden="true" />
                  <div class="font-mono text-3xl font-medium transition-all duration-300">
                    {{ numberFormatter.format(size.dependencyCount) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Size Bar -->
            <PackageSizeBar
              :package-name="packageName"
              :version="version"
              :package-size="size"
              class="transition-all duration-300 min-w-[100px] h-10"
            />
          </div>
        </div>

        <!-- Skeleton Loading State -->
        <div v-else class="flex-1 space-y-8">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div v-for="i in 3" :key="i">
              <div class="h-3 w-16 bg-bg-elevated animate-pulse rounded mb-3" />
              <div class="h-8 w-24 bg-bg-elevated animate-pulse rounded" />
            </div>
          </div>
          <div class="h-10 w-full bg-bg-elevated animate-pulse rounded-md" />
        </div>
      </header>

      <section v-if="dependencies?.length">
        <PackageSizeList
          :entries="tableData"
          :view-mode="viewMode"
          v-model:sort-column="sortColumn"
          v-model:sort-dir="sortDir"
          :is-loading="depsizesPending"
        />
      </section>

      <section v-else class="py-20 text-center">
        <div
          class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-bg-elevated mb-4"
        >
          <span class="i-lucide:package-check w-8 h-8 text-fg-muted" />
        </div>
        <p class="text-fg-muted">{{ t('package.dependencies.empty') }}</p>
      </section>
    </article>
  </main>
</template>
