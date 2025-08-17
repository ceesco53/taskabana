import React from 'react'
type Toast = { id: number; msg: string }
const Ctx = React.createContext<{ push:(msg:string)=>void } | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])
  const push = (msg: string) => {
    const id = Date.now() + Math.random()
    setToasts(ts => [...ts, { id, msg }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 3500)
  }
  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="toast-host" role="status" aria-live="polite">
        {toasts.map(t => <div key={t.id} className="toast">{t.msg}</div>)}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx.push
}