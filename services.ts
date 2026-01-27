/**
 * Dragon Suppliers Service Layer - Enhanced Production Version
 * Features: Robust case conversion and error diagnostics
 */

const env: any = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

const S_URL = env.VITE_SUPABASE_URL || "";
const S_KEY = env.VITE_SUPABASE_KEY || "";
const B_KEY = env.VITE_BREVO_API_KEY || "";

export const SupabaseConfig = {
  isConfigured: !!(S_URL && S_KEY),
  url: S_URL,
};

// Robust Camel to Snake converter
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

// Robust Snake to Camel converter
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
          'Range': '0-999',
          'Prefer': 'count=exact'
        }
      });
      
      if (!response.ok) {
        const err = await response.text();
        console.error(`DB Fetch Failed [${table}]:`, response.status, err);
        return [];
      }
      
      const data = await response.json();
      console.log(`Synced ${data.length} records from ${table}`);
      return Array.isArray(data) ? data.map(toCamelCase) : [];
    } catch (e) {
      console.error(`Network error syncing ${table}:`, e);
      return [];
    }
  },

  async fetchUserByEmail(email: string) {
    if (!SupabaseConfig.isConfigured) return null;
    try {
      const response = await fetch(`${S_URL}/rest/v1/users?email=eq.${email.toLowerCase()}&select=*`, {
        headers: {
          'apikey': S_KEY,
          'Authorization': `Bearer ${S_KEY}`
        }
      });
      const data = await response.json();
      return data && data[0] ? toCamelCase(data[0]) : null;
    } catch (e) {
      return null;
    }
  },

  async upsert(table: string, data: any): Promise<boolean> {
    if (!SupabaseConfig.isConfigured) return false;
    try {
      const dbData = toSnakeCase(data);
      const response = await fetch(`${S_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'apikey': S_KEY,
          'Authorization': `Bearer ${S_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates, return=minimal'
        },
        body: JSON.stringify(dbData)
      });
      
      if (!response.ok) {
        const err = await response.text();
        console.error(`DB Write Failed [${table}]:`, err);
        return false;
      }
      return true;
    } catch (e) {
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dbData)
      });
      return response.ok;
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
          htmlContent: `<h1>${otp}</h1>`
        })
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }
};