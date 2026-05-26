export type DepSectionId =
  | 'dependencies'
  | 'devDependencies'
  | 'peerDependencies'
  | 'optionalDependencies'
  | 'bundledDependencies'

export type DepRegistry = 'npm' | 'jsr'

export type DepFlag = 'optional' | 'bundled'

export interface PackageDependencyItem {
  name: string
  range: string
  registry: DepRegistry
  flags: DepFlag[]
}

export interface PackageDependencySection {
  id: DepSectionId
  items: PackageDependencyItem[]
}

export type DependencySortOption = 'name-asc' | 'name-desc' | 'range-asc' | 'range-desc'
