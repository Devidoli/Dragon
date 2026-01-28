/**
 * Dragon Suppliers Service Layer - Diagnostic Version
 */

const env: any = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

const S_URL = env.VITE_SUPABASE_URL || "";
const S_KEY = env.VITE_SUPABASE_KEY || "";
const B_KEY = env.VITE_BREVO_API_KEY || "";

export const SupabaseConfig = {
  isConfigured: !!(S_URL && S_KEY),
  url: S_URL,
};

// JS camelCase to DB snake_case
const toSnakeCase = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      acc[snakeKey] = toSnakeCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
};

// DB snake_case to JS camelCase
const toCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/(_\w)/g, m => m[1].toUpperCase());
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
};

export const SupabaseService = {
  async fetchTable(table: string) {
    if (!SupabaseConfig.isConfigured) return { data: [], error: "Supabase URL/Key missing in environment." };
    try {
      const response = await fetch(`${S_URL}/rest/v1/${table}?select=*`, {
        headers: {
          'apikey': S_KEY,
          'Authorization': `Bearer ${S_KEY}`,
          'Prefer': 'count=exact'
        }
      });
      
      if (!response.ok) {
        const errText = await response.text();
        return { data: [], error: `DB Error ${response.status}: ${errText}` };
      }
      
      const data = await response.json();
      return { data: Array.isArray(data) ? data.map(toCamelCase) : [], error: null };
    } catch (e: any) {
      return { data: [], error: `Network Failure: ${e.message}` };
    }
  },

  // Fixed missing fetchUserByEmail method for Login.tsx
  async fetchUserByEmail(email: string) {
    if (!SupabaseConfig.isConfigured) return null;
    try {
      const response = await fetch(`${S_URL}/rest/v1/users?email=eq.${email.toLowerCase()}&select=*`, {
        headers: {
          'apikey': S_KEY,
          'Authorization': `Bearer ${S_KEY}`
        }
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return Array.isArray(data) && data.length > 0 ? toCamelCase(data[0]) : null;
    } catch (e) {
      return null;
    }
  },

  async upsert(table: string, data: any): Promise<{ success: boolean; error: string | null }> {
    if (!SupabaseConfig.isConfigured) return { success: false, error: "Configuration missing." };
    try {
      const dbData = toSnakeCase(data);
      // PostgREST upsert requires on_conflict query param
      const response = await fetch(`${S_URL}/rest/v1/${table}?on_conflict=id`, {
        method: 'POST',
        headers: {
          'apikey': S_KEY,
          'Authorization': `Bearer ${S_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates, return=representation'
        },
        body: JSON.stringify(dbData)
      });
      
      if (!response.ok) {
        const errText = await response.text();
        return { success: false, error: errText };
      }
      return { success: true, error: null };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async update(table: string, id: string, data: any): Promise<boolean> {
    if (!SupabaseConfig.isConfigured) return false;
    try {
      const dbData = toSnakeCase(data);
      const response = await fetch(`${S_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': S_KEY,
          'Authorization': `Bearer ${S_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dbData)
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }
};

export const EmailService = {
  async sendOTP(email: string, otp: string) {
    if (!B_KEY) return true; 
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': B_KEY,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'Dragon Suppliers', email: 'olidevid203@gmail.com' },
          to: [{ email: email }],
          subject: 'Dragon Suppliers Code',
          htmlContent: `<h1>${otp}</h1>`
        })
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }
};