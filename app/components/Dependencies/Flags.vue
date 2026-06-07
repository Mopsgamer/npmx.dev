<script setup lang="ts">
import type { DepFlag } from '#shared/types/package-dependencies'

defineProps<{
  flags: DepFlag[]
}>()

const flagLabels: Record<DepFlag, string> = {
  optional: 'package.dependencies.optional',
  bundled: 'package.dependencies.bundled',
}
</script>

<template>
  <span v-if="flags.length" class="flex items-center gap-1 shrink-0">
    <span
      v-for="flag in flags"
      :key="flag"
      class="text-4xs px-1 py-0.5 rounded font-sans font-medium badge-subtle"
    >
      {{ $t(flagLabels[flag]) }}
    </span>
  </span>
</template>
