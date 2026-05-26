import type { InjectionKey } from 'vue'
import type { usePackageDependencyInsights } from '~/composables/usePackageDependencyInsights'

export const packageDependencyInsightsKey: InjectionKey<
  ReturnType<typeof usePackageDependencyInsights>
> = Symbol('packageDependencyInsights')
