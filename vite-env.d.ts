// Manual definition of ImportMetaEnv to resolve "Cannot find type definition file for 'vite/client'" error
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_KEY: string;
  readonly VITE_BREVO_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
