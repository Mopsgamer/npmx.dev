import type { InstallSizeResult } from '#shared/types/install-size'

export type SizeEntry = {
  name: string
  version: string
  selfSize: number
  totalSize: number
  depCount: number
  percentage: number
  isRoot?: boolean
  /** Full install size data when already fetched by the parent */
  installSize?: InstallSizeResult
}
