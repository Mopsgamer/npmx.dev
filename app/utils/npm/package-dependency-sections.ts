import type {
  DepFlag,
  DepRegistry,
  DepSectionId,
  PackageDependencyItem,
  PackageDependencySection,
} from '#shared/types/package-dependencies'

const SECTION_ORDER: DepSectionId[] = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
  'bundledDependencies',
]

export function inferDependencyRegistry(name: string, range: string): DepRegistry {
  if (name.startsWith('@jsr/')) return 'jsr'
  if (range.startsWith('jsr:') || range.startsWith('npm:@jsr/')) return 'jsr'
  return 'npm'
}

function entriesToItems(
  record: Record<string, string> | undefined,
  bundledSet: Set<string>,
  extraFlags?: (name: string) => DepFlag[],
): PackageDependencyItem[] {
  if (!record) return []

  return Object.entries(record)
    .map(([name, range]) => {
      const flags: DepFlag[] = [...(extraFlags?.(name) ?? [])]
      if (bundledSet.has(name) && !flags.includes('bundled')) flags.push('bundled')
      return {
        name,
        range,
        registry: inferDependencyRegistry(name, range),
        flags,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function getPackageDependencySections(
  version: PackumentVersion | null | undefined,
): PackageDependencySection[] {
  if (!version) return []

  const bundledSet = new Set(version.bundledDependencies ?? [])

  const sections: PackageDependencySection[] = [
    {
      id: 'dependencies',
      items: entriesToItems(version.dependencies, bundledSet),
    },
    {
      id: 'devDependencies',
      items: entriesToItems(version.devDependencies, bundledSet),
    },
    {
      id: 'peerDependencies',
      items: entriesToItems(version.peerDependencies, bundledSet, name => {
        const flags: DepFlag[] = []
        if (version.peerDependenciesMeta?.[name]?.optional) flags.push('optional')
        return flags
      }),
    },
    {
      id: 'optionalDependencies',
      items: entriesToItems(version.optionalDependencies, bundledSet, () => ['optional']),
    },
  ]

  const bundledOnly = (version.bundledDependencies ?? [])
    .filter(name => {
      const inOther =
        name in (version.dependencies ?? {}) ||
        name in (version.devDependencies ?? {}) ||
        name in (version.peerDependencies ?? {}) ||
        name in (version.optionalDependencies ?? {})
      return !inOther
    })
    .map(
      (name): PackageDependencyItem => ({
        name,
        range: version.dependencies?.[name] ?? '*',
        registry: inferDependencyRegistry(name, version.dependencies?.[name] ?? '*'),
        flags: ['bundled'],
      }),
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  if (bundledOnly.length > 0) {
    sections.push({ id: 'bundledDependencies', items: bundledOnly })
  }

  return sections
    .filter(section => section.items.length > 0)
    .sort((a, b) => SECTION_ORDER.indexOf(a.id) - SECTION_ORDER.indexOf(b.id))
}

export function hasPackageDependencies(version: PackumentVersion | null | undefined): boolean {
  return getPackageDependencySections(version).length > 0
}

export function getDefaultDependencySection(
  sections: PackageDependencySection[],
): DepSectionId | null {
  return sections[0]?.id ?? null
}

export function isDepSectionId(value: string): value is DepSectionId {
  return SECTION_ORDER.includes(value as DepSectionId)
}

export function dependencySectionRecord(
  section: PackageDependencySection | undefined,
): Record<string, string> | undefined {
  if (!section?.items.length) return undefined
  return Object.fromEntries(section.items.map(item => [item.name, item.range]))
}
