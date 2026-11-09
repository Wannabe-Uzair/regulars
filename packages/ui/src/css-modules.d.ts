// CSS Modules, as Vite compiles them. apps/web gets the same shape from `vite/client`.
declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>
  export default classes
}
