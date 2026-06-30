/// <reference types="astro/client" />

// Starlight virtual component modules are resolved at build time by the
// Starlight Vite plugin but have no static type declarations. Declaring them
// as any-typed ambient modules silences ts(2307) without affecting runtime.
declare module "virtual:starlight/components/MobileMenuToggle" {
  const Component: import("astro").AstroComponentFactory;
  export default Component;
}
