/// <reference types="vite/client" />

// TODO lo VITE_* es PUBLICO en el bundle (ver .env.example).
interface ImportMetaEnv {
  readonly VITE_POWER_AUTOMATE_URL?: string;
  readonly VITE_APP_KEY?: string;
  readonly VITE_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
