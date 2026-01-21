// Fix: Removed the triple-slash reference to 'vite/client' which was failing to resolve in this environment.
// Declaring ImportMeta and ImportMetaEnv manually to ensure environment variables are typed correctly for the compiler.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_KEY: string
  readonly VITE_BREVO_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
