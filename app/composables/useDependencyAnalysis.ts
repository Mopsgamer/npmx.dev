/**
 * Shared composable for dependency analysis data (vulnerabilities, deprecated packages).
 * Fetches once and caches the result so multiple components can use it.
 * Before: useVulnerabilityTree - but now we use this for both vulnerabilities and deprecated packages.
 */
export function useDependencyAnalysis(
  packageName: MaybeRefOrGetter<string>,
  version: MaybeRefOrGetter<string>,
) {
  return useFetch(
    () =>
      `/api/registry/vulnerabilities/${encodePackageName(toValue(packageName))}/v/${toValue(version)}`,
    {
      key: `vuln:${toValue(packageName)}:${toValue(version)}`,
      watch: [() => toValue(packageName), () => toValue(version)],
      server: false,
      lazy: true,
    },
  )
}
