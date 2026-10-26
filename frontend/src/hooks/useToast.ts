import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: number
  type: ToastType
  message: string
}

// ─── Singleton state ─────────────────────────────────────────────────────────
// All hook instances share this array and the listener set.
let _toasts: ToastItem[] = []
let _nextId = 1
const _listeners = new Set<(toasts: ToastItem[]) => void>()

function _notify() {
  _listeners.forEach((fn) => fn([..._toasts]))
}

function _add(type: ToastType, message: string, duration = 4000) {
  const id = _nextId++
  _toasts = [..._toasts, { id, type, message }]
  _notify()
  setTimeout(() => {
    _toasts = _toasts.filter((t) => t.id !== id)
    _notify()
  }, duration)
}

function _dismiss(id: number) {
  _toasts = _toasts.filter((t) => t.id !== id)
  _notify()
}

// ─── Public toast object ──────────────────────────────────────────────────────
export const toast = {
  success: (msg: string, duration?: number) => _add('success', msg, duration),
  error: (msg: string, duration?: number) => _add('error', msg, duration),
  warning: (msg: string, duration?: number) => _add('warning', msg, duration),
  info: (msg: string, duration?: number) => _add('info', msg, duration),
  dismiss: (id: number) => _dismiss(id),
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([..._toasts])

  useEffect(() => {
    _listeners.add(setToasts)
    return () => {
      _listeners.delete(setToasts)
    }
  }, [])

  return { toasts, dismiss: _dismiss }
}
