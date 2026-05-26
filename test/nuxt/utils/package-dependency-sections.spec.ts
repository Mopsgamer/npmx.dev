import { describe, expect, it } from 'vitest'
import {
  getDefaultDependencySection,
  getPackageDependencySections,
  hasPackageDependencies,
  inferDependencyRegistry,
} from '~/utils/npm/package-dependency-sections'

describe('package-dependency-sections', () => {
  it('detects jsr registry from package name', () => {
    expect(inferDependencyRegistry('@jsr/std__path', '^1.0.0')).toBe('jsr')
    expect(inferDependencyRegistry('lodash', '^4.0.0')).toBe('npm')
  })

  it('builds sections in order and omits empty ones', () => {
    const sections = getPackageDependencySections({
      dependencies: { lodash: '^4.0.0' },
      devDependencies: { vitest: '^1.0.0' },
      peerDependencies: { vue: '^3.0.0' },
      peerDependenciesMeta: { vue: { optional: true } },
    } as PackumentVersion)

    expect(sections.map(s => s.id)).toEqual(['dependencies', 'devDependencies', 'peerDependencies'])
    expect(sections[2]?.items[0]?.flags).toContain('optional')
  })

  it('reports whether a version has dependencies', () => {
    expect(hasPackageDependencies({} as PackumentVersion)).toBe(false)
    expect(
      hasPackageDependencies({ optionalDependencies: { fsevents: '^2.0.0' } } as PackumentVersion),
    ).toBe(true)
  })

  it('defaults to the first available section', () => {
    const sections = getPackageDependencySections({
      devDependencies: { vitest: '^1.0.0' },
    } as PackumentVersion)
    expect(getDefaultDependencySection(sections)).toBe('devDependencies')
  })
})
