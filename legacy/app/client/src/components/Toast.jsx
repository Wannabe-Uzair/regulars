import { createContext, useCallback, useContext, useRef, useState } from 'react'
// <ToastProvider> once at the root; const toast = useToast(); toast('SAM O. CHECKED IN'). 4 s, bottom right on desktop / above the tabs on phones.
const Ctx = createContext(() => {})
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const n = useRef(0)
  const toast = useCallback((text, ms = 4000) => {
    const id = ++n.current
    setItems((xs) => [...xs.slice(-2), { id, text }])
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), ms)
  }, [])
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => <div key={t.id} className="toast label">{t.text}</div>)}
      </div>
    </Ctx.Provider>
  )
}
export const useToast = () => useContext(Ctx)
export default ToastProvider
