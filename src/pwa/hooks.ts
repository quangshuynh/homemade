import { useSyncExternalStore } from 'react'
import { installer } from './install'
import { updates } from './updates'

export function useUpdateReady(): boolean {
  return useSyncExternalStore(updates.subscribe, updates.getUpdateReady, () => false)
}

export function useCanInstall(): boolean {
  return useSyncExternalStore(installer.subscribe, installer.canInstall, () => false)
}
