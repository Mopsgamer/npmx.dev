<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { DepSectionId, DependencySortOption } from '#shared/types/package-dependencies'
import type { ViewMode } from '#shared/types/preferences'
import {
  dependencySectionRecord,
  getDefaultDependencySection,
  getPackageDependencySections,
  isDepSectionId,
} from '~/utils/npm/package-dependency-sections'

definePageMeta({
  name: 'dependencies',
  path: '/package-deps/:org?/:packageName/v/:version',
  alias: [
    '/package/dependencies/:org?/:packageName/v/:version',
    '/package/dependencies/:packageName/v/:version',
  ],
  scrollMargin: 160,
})

const route = useRoute('dependencies')
const router = useRouter()

const packageName = computed(() =>
  route.params.org ? `${route.params.org}/${route.params.packageName}` : route.params.packageName,
)
const version = computed(() => route.params.version)

const { data: pkg, status: pkgStatus } = usePackage(packageName, version)
const { versions: commandPaletteVersions, ensureLoaded: ensureCommandPaletteVersionsLoaded } =
  useCommandPalettePackageVersions(packageName)

const displayVersion = computed(() => pkg.value?.requestedVersion ?? null)

const sections = computed(() => getPackageDependencySections(displayVersion.value))

const activeSection = computed<DepSectionId | null>(() => {
  const querySection = route.query.section
  if (typeof querySection === 'string' && isDepSectionId(querySection)) {
    if (sections.value.some(s => s.id === querySection)) return querySection
  }
  return getDefaultDependencySection(sections.value)
})

const currentSection = computed(() => sections.value.find(s => s.id === activeSection.value))

const sectionDependencies = computed(() => dependencySectionRecord(currentSection.value))

watch(
  [sections, () => route.query.section],
  () => {
    if (sections.value.length === 0) return
    const querySection = route.query.section
    const validQuery =
      typeof querySection === 'string' &&
      isDepSectionId(querySection) &&
      sections.value.some(s => s.id === querySection)
    if (!validQuery && activeSection.value) {
      router.replace({
        ...route,
        query: { ...route.query, section: activeSection.value },
      })
    }
  },
  { immediate: true },
)

function getSectionLink(section: DepSectionId): RouteLocationRaw {
  return dependenciesRoute(packageName.value, version.value, section)
}

const versionUrlPattern = computed(() => {
  const section = activeSection.value
  const base = route.params.org
    ? `/package-deps/${route.params.org}/${route.params.packageName}/v/{version}`
    : `/package-deps/${route.params.packageName}/v/{version}`
  return section ? `${base}?section=${section}` : base
})

function depsVersionRoute(nextVersion: string): RouteLocationRaw {
  return dependenciesRoute(packageName.value, nextVersion, activeSection.value ?? undefined)
}

const commandPalettePackageContext = computed(() => {
  const packageData = pkg.value
  if (!packageData) return null

  return {
    packageName: packageData.name,
    resolvedVersion: version.value ?? packageData['dist-tags']?.latest ?? null,
    latestVersion: packageData['dist-tags']?.latest ?? null,
    versions: commandPaletteVersions.value ?? Object.keys(packageData.versions ?? {}),
  }
})

useCommandPalettePackageContext(commandPalettePackageContext, {
  onOpen: ensureCommandPaletteVersionsLoaded,
})
useCommandPalettePackageCommands(commandPalettePackageContext)
useCommandPaletteVersionCommands(commandPalettePackageContext, depsVersionRoute)

const dependencyInsights = usePackageDependencyInsights(packageName, version, sectionDependencies)
provide(packageDependencyInsightsKey, dependencyInsights)

const filter = ref('')
const sort = ref<DependencySortOption>('name-asc')
const viewMode = ref<ViewMode>('cards')

const filteredItems = computed(() => {
  const items = currentSection.value?.items ?? []
  const query = filter.value.trim().toLowerCase()
  let result = query ? items.filter(item => item.name.toLowerCase().includes(query)) : [...items]

  result.sort((a, b) => {
    switch (sort.value) {
      case 'name-desc':
        return b.name.localeCompare(a.name)
      case 'range-asc':
        return a.range.localeCompare(b.range)
      case 'range-desc':
        return b.range.localeCompare(a.range)
      default:
        return a.name.localeCompare(b.name)
    }
  })

  return result
})

const latestVersion = computed(() => {
  if (!pkg.value) return null
  const latestTag = pkg.value['dist-tags']?.latest
  if (!latestTag) return null
  return pkg.value.versions[latestTag] ?? null
})

useSeoMeta({
  title: () =>
    pkg.value ? `${pkg.value.name}@${version.value} dependencies - npmx` : 'Dependencies - npmx',
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
      :resolved-version="version"
      :display-version="displayVersion"
      :latest-version="latestVersion"
      :version-url-pattern="versionUrlPattern"
      page="dependencies"
    />

    <div v-if="!version" class="container py-20 text-center">
      <p class="text-fg-muted mb-4">{{ $t('package.dependencies.version_required') }}</p>
      <LinkBase variant="button-secondary" :to="packageRoute(packageName)">{{
        $t('code.go_to_package')
      }}</LinkBase>
    </div>

    <div v-else-if="pkgStatus === 'pending'" class="container py-20 text-center">
      <div class="i-svg-spinners:ring-resize w-8 h-8 mx-auto text-fg-muted" />
    </div>

    <div v-else-if="sections.length === 0" class="container py-20 text-center">
      <p class="text-fg-muted mb-4">{{ $t('package.dependencies.none') }}</p>
      <LinkBase variant="button-secondary" :to="packageRoute(packageName, version)">{{
        $t('code.back_to_package')
      }}</LinkBase>
    </div>

    <article
      v-else-if="activeSection && currentSection"
      id="package-article"
      :class="$style.packagePage"
      class="container w-full"
      dir="ltr"
    >
      <div :class="$style.areaContent">
        <div class="py-4">
          <DependenciesToolbar
            v-model:filter="filter"
            v-model:sort="sort"
            v-model:view-mode="viewMode"
            :filtered-count="filteredItems.length"
            :total-count="currentSection?.items?.length ?? 0"
            :sections="sections"
            :active-section="activeSection || undefined"
            @update:active-section="router.push(getSectionLink($event as DepSectionId))"
          />

          <DependenciesList
            v-if="filteredItems.length > 0"
            :items="filteredItems"
            :view-mode="viewMode"
            :show-skeleton="showSkeleton"
            :sort="sort"
            @update:sort="sort = $event"
          />

          <p v-else class="py-12 text-center text-fg-subtle font-mono text-sm">
            {{ $t('package.dependencies.no_matches') }}
          </p>
        </div>
      </div>

      <PackageSidebar :class="$style.areaSidebar">
        <div class="flex flex-col gap-4 sm:gap-6 pt-4">
          <DependenciesInsightsSummary :sections="sections" :show-skeleton="showSkeleton" />
        </div>
      </PackageSidebar>
    </article>
  </main>
</template>

<style module>
.packagePage {
  display: grid;
  gap: 2rem;
  word-wrap: break-word;
  overflow-wrap: break-word;

  /* Mobile: single column, sidebar (navigation) above content */
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas:
    'sidebar'
    'content';
}

/* Tablet/medium: side by side */
@media (min-width: 1024px) {
  .packagePage {
    grid-template-columns: 2fr 1fr;
    grid-template-areas: 'content sidebar';
  }
}

/* Desktop: floating sidebar */
@media (min-width: 1280px) {
  .packagePage {
    grid-template-columns: 1fr 20rem;
    grid-template-areas: 'content sidebar';
  }
}

.areaContent {
  grid-area: content;
  min-width: 0;
}

.areaSidebar {
  grid-area: sidebar;
}
</style>
