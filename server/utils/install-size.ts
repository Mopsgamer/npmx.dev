/**
 * Calculate the total install size for a package.
 *
 * Resolves dependencies by fetching packuments directly from the npm registry.
 * No filesystem operations - safe for serverless environments.
 *
 * Dependencies are resolved for linux-x64-glibc as a representative platform.
 */
export const calculateInstallSize = defineCachedFunction(
  async (name: string, version: string): Promise<InstallSizeResult> => {
    const resolved = await resolveDependencyTree(name, version, { trackDepth: true })

    // Helper to calculate subtree info from the resolved paths
    const getSubtreeInfo = (rootKey: string) => {
      const rootPkg = resolved.get(rootKey)
      if (!rootPkg || !rootPkg.path) return { totalSize: 0, dependencyCount: 0 }

      const rootPathPrefix = rootPkg.path.join('|')
      let totalSize = 0
      let dependencyCount = 0

      for (const pkg of resolved.values()) {
        if (!pkg.path) continue
        const pathStr = pkg.path.join('|')
        if (pathStr === rootPathPrefix || pathStr.startsWith(rootPathPrefix + '|')) {
          totalSize += pkg.size
          if (pathStr !== rootPathPrefix) {
            dependencyCount++
          }
        }
      }
      return { totalSize, dependencyCount }
    }

    // Separate self from dependencies
    const selfKey = `${name}@${version}`
    const selfEntry = resolved.get(selfKey)
    const selfSize = selfEntry?.size ?? 0

    // Build dependencies list (excluding self)
    const dependencies: DependencySize[] = []
    let totalSize = selfSize
    let dependencyCount = 0

    for (const [key, dep] of resolved) {
      if (key === selfKey) continue

      const subtree = getSubtreeInfo(key)
      dependencies.push({
        name: dep.name,
        version: dep.version,
        size: dep.size,
        tarballUrl: dep.tarballUrl,
        optional: dep.optional || undefined,
        totalSize: subtree.totalSize,
        dependencyCount: subtree.dependencyCount,
      })
      totalSize += dep.size
      dependencyCount++
    }

    // Sort by size descending
    dependencies.sort((a, b) => b.size - a.size)

    return {
      package: name,
      version,
      selfSize,
      totalSize,
      dependencyCount,
      dependencies,
    }
  },
  {
    // Cache for 1 hour - dependency resolutions can change with new releases
    maxAge: 60 * 60,
    swr: true,
    name: 'install-size',
    getKey: (name: string, version: string) => `${name}@${version}`,
  },
)
