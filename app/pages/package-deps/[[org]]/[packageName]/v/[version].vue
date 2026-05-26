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

const mobileSectionDrawerRef = useTemplateRef('mobileSectionDrawerRef')

function toggleMobileSectionDrawer() {
  mobileSectionDrawerRef.value?.toggle()
}

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
</script>

<template>
  <main class="flex-1 flex flex-col">
    <PackageHeader
      :pkg="pkg"
      :resolved-version="version"
      :display-version="displayVersion"
      :latest-version="latestVersion"
      :version-url-pattern="versionUrlPattern"
      page="dependencies"
    />

    <div v-if="!version" class="container py-20 text-center">
      <p class="text-fg-muted mb-4">{{ $t('package.deps_tab.version_required') }}</p>
      <LinkBase variant="button-secondary" :to="packageRoute(packageName)">{{
        $t('code.go_to_package')
      }}</LinkBase>
    </div>

    <div v-else-if="pkgStatus === 'pending'" class="container py-20 text-center">
      <div class="i-svg-spinners:ring-resize w-8 h-8 mx-auto text-fg-muted" />
    </div>

    <div v-else-if="sections.length === 0" class="container py-20 text-center">
      <p class="text-fg-muted mb-4">{{ $t('package.deps_tab.none') }}</p>
      <LinkBase variant="button-secondary" :to="packageRoute(packageName, version)">{{
        $t('code.back_to_package')
      }}</LinkBase>
    </div>

    <div
      v-else-if="activeSection && currentSection"
      class="w-full container grid grid-cols-[18rem_1fr] max-lg:grid-cols-[16rem_1fr] max-md:grid-cols-[1fr] border-border border-x px-0 mx-auto"
      dir="ltr"
    >
      <aside
        class="sticky top-25 w-64 lg:w-72 hidden md:block h-[calc(100vh-10.5rem)] shrink-0 self-start bg-bg-subtle border-ie border-border"
      >
        <div class="h-[calc(100vh-10.5rem)] overflow-y-auto">
          <DependenciesSectionNav
            :sections="sections"
            :active-section="activeSection"
            :get-section-link="getSectionLink"
          />
        </div>
      </aside>

      <div class="flex-1 grid grid-rows-[auto_1fr] min-w-0 self-start min-h-[calc(100vh-10.5rem)]">
        <DependenciesHeader
          :section="activeSection"
          @mobile-nav-toggle="toggleMobileSectionDrawer"
        />

        <div class="overflow-y-auto p-4">
          <DependenciesToolbar
            v-model:filter="filter"
            v-model:sort="sort"
            v-model:view-mode="viewMode"
            :filtered-count="filteredItems.length"
            :total-count="currentSection.items.length"
          />

          <DependenciesList
            v-if="filteredItems.length > 0"
            :items="filteredItems"
            :view-mode="viewMode"
            :sort="sort"
            @update:sort="sort = $event"
          />

          <p v-else class="py-12 text-center text-fg-subtle font-mono text-sm">
            {{ $t('package.deps_tab.no_matches') }}
          </p>
        </div>
      </div>
    </div>

    <ClientOnly>
      <Teleport to="body">
        <DependenciesMobileSectionDrawer
          v-if="sections.length > 0 && activeSection"
          ref="mobileSectionDrawerRef"
          :sections="sections"
          :active-section="activeSection"
          :get-section-link="getSectionLink"
        />
      </Teleport>
    </ClientOnly>
  </main>
</template>
