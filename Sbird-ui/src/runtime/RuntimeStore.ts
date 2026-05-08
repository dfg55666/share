import { useSyncExternalStore } from 'react'

export type RuntimeStoreLike<TState> = {
  getState: () => TState
  subscribe: (listener: (state: TState) => void) => () => void
}

export function useRuntimeStore<TState>(store: RuntimeStoreLike<TState>): TState {
  return useSyncExternalStore(
    (onStoreChange) => store.subscribe(() => onStoreChange()),
    () => store.getState(),
    () => store.getState(),
  )
}
