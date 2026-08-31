<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { setResponseHeader } from 'h3'
import type { DepSectionId, DependencySortOption } from '#shared/types/package-dependencies'
import { assertValidPackageName } from '#shared/utils/npm'
import {
  getDefaultDependencySection,
  getPackageDependencySections,
  isDepSectionId,
} from '~/utils/npm/package-dependency-sections'
import { getVulnerableDepInfo, getDeprecatedDepInfo } from '~/utils/npm/problematic-dependencies'

definePageMeta({
  name: 'dependencies',
  path: '/package-deps/:path+',
  alias: ['/package/dependencies/:path+', '/dependencies/:path+'],
  scrollMargin: 160,
})

const route = useRoute('dependencies')
const router = useRouter()

const { packageName, requestedVersion } = usePackageRoute()

if (import.meta.server && packageName.value) {
  assertValidPackageName(packageName.value)
}

const { data: resolvedVersion } = await useResolvedVersion(packageName, requestedVersion)

const { data: pkg, status: pkgStatus } = usePackage(
  packageName,
  () => resolvedVersion.value ?? requestedVersion.value,
)
const { versions: commandPaletteVersions, ensureLoaded: ensureCommandPaletteVersionsLoaded } =
  useCommandPalettePackageVersions(packageName)

const latestVersionTag = computed(() => pkg.value?.['dist-tags']?.latest ?? null)

if (import.meta.server && !requestedVersion.value && packageName.value) {
  const app = useNuxtApp()
  const latest = await fetchLatestVersion(packageName.value)
  if (latest) {
    setResponseHeader(useRequestEvent()!, 'Cache-Control', 'no-cache')
    app.runWithContext(() =>
      navigateTo(dependenciesRoute(packageName.value, latest), { redirectCode: 302 }),
    )
  }
}

watch(
  [requestedVersion, latestVersionTag, packageName],
  ([reqVer, latest, name]) => {
    if (!reqVer && latest && name) {
      router.replace(dependenciesRoute(name, latest))
    }
  },
  { immediate: true },
)

const displayVersion = computed(() => pkg.value?.requestedVersion ?? null)

const sections = computed(() => getPackageDependencySections(displayVersion.value))

const activeSections = ref<string[]>(
  typeof route.query.section === 'string' && isDepSectionId(route.query.section)
    ? [route.query.section]
    : ['dependencies'],
)

watch(
  sections,
  s => {
    if (s.length > 0 && activeSections.value.length === 0) {
      const querySection = route.query.section
      if (typeof querySection === 'string' && isDepSectionId(querySection)) {
        activeSections.value = [querySection]
      } else {
        const defaultSec = getDefaultDependencySection(s)
        activeSections.value = defaultSec ? [defaultSec] : s.map(sec => sec.id)
      }
    }
  },
  { immediate: true },
)

const currentSections = computed(() =>
  sections.value.filter(s => activeSections.value.includes(s.id)),
)

const allSectionItems = computed(() => {
  return currentSections.value.flatMap(s => s.items)
})

const allDependencies = computed<Record<string, string>>(() => {
  const reqVer = pkg.value?.requestedVersion
  if (!reqVer) return {}
  const record: Record<string, string> = {
    ...reqVer.dependencies,
    ...reqVer.devDependencies,
    ...reqVer.peerDependencies,
    ...reqVer.optionalDependencies,
  }
  if (Array.isArray(reqVer.bundledDependencies)) {
    for (const name of reqVer.bundledDependencies) {
      if (!record[name]) {
        record[name] = reqVer.dependencies?.[name] ?? '*'
      }
    }
  }
  return record
})

watch(
  [sections, () => route.query.section],
  () => {
    if (sections.value.length === 0) return
    const querySection = route.query.section
    const validQuery =
      typeof querySection === 'string' &&
      isDepSectionId(querySection) &&
      sections.value.some(s => s.id === querySection)
    if (!validQuery && activeSections.value[0]) {
      router.replace({
        ...route,
        query: { ...route.query, section: activeSections.value[0] },
      })
    }
  },
  { immediate: true },
)

const versionUrlPattern = computed(() => {
  const section = activeSections.value[0]
  const base = `/package-deps/${pkg.value?.name || packageName.value}/v/{version}`
  return section ? `${base}?section=${section}` : base
})

function depsVersionRoute(nextVersion: string): RouteLocationRaw {
  return dependenciesRoute(
    packageName.value,
    nextVersion,
    activeSections.value[0] as DepSectionId | undefined,
  )
}

const commandPalettePackageContext = computed(() => {
  const packageData = pkg.value
  if (!packageData) return null

  return {
    packageName: packageData.name,
    resolvedVersion: resolvedVersion.value ?? packageData['dist-tags']?.latest ?? null,
    latestVersion: packageData['dist-tags']?.latest ?? null,
    versions: commandPaletteVersions.value ?? Object.keys(packageData.versions ?? {}),
  }
})

useCommandPalettePackageContext(commandPalettePackageContext, {
  onOpen: ensureCommandPaletteVersionsLoaded,
})
useCommandPalettePackageCommands(commandPalettePackageContext)
useCommandPaletteVersionCommands(commandPalettePackageContext, depsVersionRoute)

const insights = usePackageDependencyInsights(
  packageName,
  () => resolvedVersion.value || '',
  allDependencies,
)

const { viewMode, columns, toggleColumn, resetColumns } = usePackageListPreferences()

const filter = ref('')
const selectedInsights = ref<string[]>([])
const sort = ref<DependencySortOption>('name-asc')

const dependencyMetas = ref<Record<string, PackageMetaResponse>>({})

watch(
  allSectionItems,
  items => {
    if (!items) return
    for (const item of items) {
      if (dependencyMetas.value[item.name]) continue
      fetchPackageMeta(item.name)
        .then(data => {
          if (data) dependencyMetas.value[item.name] = data
        })
        .catch(() => {})
    }
  },
  { immediate: true },
)

const filteredItems = computed(() => {
  const items = allSectionItems.value
  const query = filter.value.trim().toLowerCase()
  let result = query ? items.filter(item => item.name.toLowerCase().includes(query)) : [...items]

  if (selectedInsights.value.length > 0) {
    result = result.filter(item => {
      const outdated = insights.outdatedDeps.value[item.name]
      return selectedInsights.value.some(id => {
        switch (id) {
          case 'major':
            return outdated ? outdated.majorsBehind > 0 : false
          case 'minor':
            return outdated ? outdated.majorsBehind === 0 && outdated.minorsBehind > 0 : false
          case 'patch':
            return outdated
              ? outdated.majorsBehind === 0 &&
                  outdated.minorsBehind === 0 &&
                  outdated.resolved !== outdated.latest
              : false
          case 'vulnerable':
            return !!getVulnerableDepInfo(item.name, insights.vulnTree.value)
          case 'deprecated':
            return !!getDeprecatedDepInfo(item.name, insights.vulnTree.value)
          case 'replacement':
            return !!insights.replacementDeps.value[item.name]
          default:
            return false
        }
      })
    })
  }

  result.sort((a, b) => {
    const metaA = dependencyMetas.value[a.name]
    const metaB = dependencyMetas.value[b.name]

    switch (sort.value) {
      case 'name-desc':
        return b.name.localeCompare(a.name)
      case 'downloads-week-desc':
        return (metaB?.weeklyDownloads ?? 0) - (metaA?.weeklyDownloads ?? 0)
      case 'downloads-week-asc':
        return (metaA?.weeklyDownloads ?? 0) - (metaB?.weeklyDownloads ?? 0)
      case 'updated-desc':
        return (
          (metaB?.date ? Date.parse(metaB.date) : 0) - (metaA?.date ? Date.parse(metaA.date) : 0)
        )
      case 'updated-asc':
        return (
          (metaA?.date ? Date.parse(metaA.date) : 0) - (metaB?.date ? Date.parse(metaB.date) : 0)
        )
      default:
        return a.name.localeCompare(b.name)
    }
  })

  return result
})

const isInsightsLoading = computed(() => {
  if (selectedInsights.value.length === 0) return false
  return selectedInsights.value.some(id => {
    if (['major', 'minor', 'patch'].includes(id)) {
      return insights.outdatedStatus.value === 'pending' || insights.outdatedStatus.value === 'idle'
    }
    if (['vulnerable', 'deprecated'].includes(id)) {
      return insights.vulnStatus.value === 'pending' || insights.vulnStatus.value === 'idle'
    }
    if (id === 'replacement') {
      return (
        insights.replacementStatus.value === 'pending' ||
        insights.replacementStatus.value === 'idle'
      )
    }
    return false
  })
})

const latestVersion = computed(() => {
  if (!pkg.value) return null
  const latestTag = pkg.value['dist-tags']?.latest
  if (!latestTag) return null
  return pkg.value.versions[latestTag] ?? null
})

useSeoMeta({
  title: () =>
    pkg.value && resolvedVersion.value
      ? `${pkg.value.name}@${resolvedVersion.value} dependencies - npmx`
      : 'Dependencies - npmx',
})

const showSkeleton = shallowRef(false)
</script>

<template>
  <DevOnly>
    <ButtonBase
      class="fixed bottom-4 inset-is-4 z-50 shadow-lg rounded-full! px-3! py-2!"
      classicon="i-simple-icons:skeleton"
      variant="primary"
      title="Toggle skeleton loader (development only)"
      :aria-pressed="showSkeleton"
      @click="showSkeleton = !showSkeleton"
    >
      <span class="text-xs">Skeleton</span>
    </ButtonBase>
  </DevOnly>
  <main class="flex-1 pb-8">
    <PackageHeader
      :pkg="pkg"
      :resolved-version="resolvedVersion"
      :display-version="displayVersion"
      :latest-version="latestVersion"
      :version-url-pattern="versionUrlPattern"
      page="dependencies"
    />

    <div v-if="pkgStatus === 'pending' || pkgStatus === 'idle'" class="container py-20 text-center">
      <div class="i-svg-spinners:ring-resize w-8 h-8 mx-auto text-fg-muted" />
    </div>

    <div
      v-else-if="pkgStatus === 'error'"
      role="alert"
      class="flex flex-col items-center py-20 text-center container w-full"
    >
      <h1 class="font-mono text-2xl font-medium mb-4">
        {{ $t('package.not_found') }}
      </h1>
      <p class="text-fg-muted mb-8">
        {{ $t('package.not_found_message') }}
      </p>
      <LinkBase variant="button-secondary" :to="{ name: 'index' }">{{
        $t('common.go_back_home')
      }}</LinkBase>
    </div>

    <div v-else-if="sections.length === 0" class="container py-20 text-center">
      <p class="text-fg-muted mb-4">{{ $t('package.dependencies.none') }}</p>
      <LinkBase variant="button-secondary" :to="packageRoute(packageName, requestedVersion)">{{
        $t('code.back_to_package')
      }}</LinkBase>
    </div>

    <article
      v-else-if="sections.length > 0"
      id="package-article"
      class="container w-full"
      dir="ltr"
    >
      <DependenciesInsightsSummary
        v-model:selected-insights="selectedInsights"
        :sections="sections"
        :show-skeleton="showSkeleton"
        :insights="insights"
        :package-name="packageName"
      />

      <div class="py-4">
        <DependenciesToolbar
          v-model:filter="filter"
          v-model:sort="sort"
          v-model:view-mode="viewMode"
          v-model:active-sections="activeSections"
          :columns="columns"
          :filtered-count="filteredItems.length"
          :total-count="allSectionItems.length"
          :sections="sections"
          @toggle-column="toggleColumn"
          @reset-columns="resetColumns"
        />

        <div v-if="isInsightsLoading" class="py-12 text-center">
          <div class="i-svg-spinners:ring-resize w-6 h-6 mx-auto text-fg-muted" />
        </div>

        <DependenciesList
          v-else-if="filteredItems.length > 0"
          :items="filteredItems"
          :view-mode="viewMode"
          :columns="columns"
          :show-skeleton="showSkeleton"
          :sort="sort"
          :insights="insights"
          @update:sort="sort = $event"
        />

        <p v-else class="py-12 text-center text-fg-subtle font-mono text-sm">
          {{ $t('package.dependencies.no_matches') }}
        </p>
      </div>
    </article>
  </main>
</template>
