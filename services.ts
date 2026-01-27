/**
 * Dragon Suppliers Service Layer - Enhanced Production Version
 * Features: Automatic case conversion and robust error logging
 */

const env: any = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

const S_URL = env.VITE_SUPABASE_URL;
const S_KEY = env.VITE_SUPABASE_KEY;
const B_KEY = env.VITE_BREVO_API_KEY;

export const SupabaseConfig = {
  isConfigured: !!(S_URL && S_KEY),
  url: S_URL || "NONE",
};

// Utility to convert JS camelCase to DB snake_case
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

// Utility to convert DB snake_case to JS camelCase
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
    if (!SupabaseConfig.isConfigured) return [];
    try {
      const response = await fetch(`${S_URL}/rest/v1/${table}?select=*`, {
        headers: {
          'apikey': S_KEY,
          'Authorization': `Bearer ${S_KEY}`,
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const errText = await response.text();
        console.error(`Supabase Fetch Error (${table}):`, response.status, errText);
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data.map(toCamelCase) : [];
    } catch (e) {
      console.error(`Network error during fetch (${table}):`, e);
      return [];
    }
  },

  async fetchUserByEmail(email: string) {
    if (!SupabaseConfig.isConfigured) return null;
    try {
      const response = await fetch(`${S_URL}/rest/v1/users?email=eq.${email.toLowerCase()}&select=*`, {
        headers: {
          'apikey': S_KEY,
          'Authorization': `Bearer ${S_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data && data[0] ? toCamelCase(data[0]) : null;
    } catch (e) {
      return null;
    }
  },

  async upsert(table: string, data: any): Promise<boolean> {
    if (!SupabaseConfig.isConfigured) {
      console.warn(`Supabase not configured. Record for ${table} only exists locally.`);
      return false;
    }
    try {
      const dbData = toSnakeCase(data);
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
        console.error(`Supabase Write Failure (${table}):`, response.status, errText);
        return false;
      }
      return true;
    } catch (e) {
      console.error(`Supabase Sync Error (${table}):`, e);
      return false;
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
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(dbData)
      });
      
      if (!response.ok) return false;
      return true;
    } catch (e) {
      return false;
    }
  },

  async delete(table: string, id: string): Promise<boolean> {
    if (!SupabaseConfig.isConfigured) return false;
    try {
      const response = await fetch(`${S_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': S_KEY,
          'Authorization': `Bearer ${S_KEY}`
        }
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
          subject: 'Dragon Suppliers: Verification Code',
          htmlContent: `<div style="padding:40px;background:#0f172a;color:#fff;border-radius:20px;text-align:center;"><h1>DRAGON</h1><div style="font-size:40px;">${otp}</div></div>`
        })
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }
};