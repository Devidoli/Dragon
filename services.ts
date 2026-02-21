
/**
 * Dragon Suppliers Service Layer - Production Version
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
  async getTable(table: string, retryCount = 0): Promise<{ data: any[]; error: string | null }> {
    if (!SupabaseConfig.isConfigured) return { data: [], error: "Supabase URL/Key missing in environment." };
    try {
      const response = await window.fetch(`${S_URL}/rest/v1/${table}?select=*`, {
        headers: {
          'apikey': S_KEY,
          'Authorization': `Bearer ${S_KEY}`,
          'Prefer': 'count=exact'
        }
      });
      
      if (response.status === 429 && retryCount < 2) {
        // Wait 1s and retry
        await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
        return SupabaseService.getTable(table, retryCount + 1);
      }

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

  async getUserByEmail(email: string) {
    if (!SupabaseConfig.isConfigured) return null;
    try {
      const response = await window.fetch(`${S_URL}/rest/v1/users?email=eq.${email.toLowerCase()}&select=*`, {
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
      const response = await window.fetch(`${S_URL}/rest/v1/${table}?on_conflict=id`, {
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
      const response = await window.fetch(`${S_URL}/rest/v1/${table}?id=eq.${id}`, {
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
      const response = await window.fetch(`${S_URL}/rest/v1/${table}?id=eq.${id}`, {
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
  },

  async upsertMany(table: string, data: any[]): Promise<{ success: boolean; error: string | null }> {
    if (!SupabaseConfig.isConfigured) return { success: false, error: "Configuration missing." };
    if (data.length === 0) return { success: true, error: null };
    try {
      const dbData = toSnakeCase(data);
      const response = await window.fetch(`${S_URL}/rest/v1/${table}`, {
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

  async deleteMany(table: string, ids: string[]): Promise<boolean> {
    if (!SupabaseConfig.isConfigured || ids.length === 0) return false;
    try {
      const idList = ids.join(',');
      const response = await window.fetch(`${S_URL}/rest/v1/${table}?id=in.(${idList})`, {
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
  },

  async updateMany(table: string, updates: { id: string, data: any }[]): Promise<boolean> {
    // PostgREST doesn't support bulk updates with different values easily in one request
    // without a custom function. We'll use sequential with a small delay to avoid burst.
    for (const update of updates) {
      await SupabaseService.update(table, update.id, update.data);
      await new Promise(r => setTimeout(r, 100));
    }
    return true;
  }
};

export const EmailService = {
  async sendOTP(email: string, otp: string) {
    if (!B_KEY) return true; 
    try {
      const htmlContent = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
          <div style="background-color: #dc2626; padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px; font-weight: 900;">Dragon Suppliers</h1>
            <p style="color: #fca5a5; margin: 10px 0 0 0; font-size: 12px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase;">Official Merchant Network</p>
          </div>
          <div style="padding: 40px; text-align: center; color: #1e293b;">
            <h2 style="font-size: 20px; margin-bottom: 20px; font-weight: 800; text-transform: uppercase;">Security Verification</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #64748b;">A request was made to access your merchant portal. Use the code below to securely sign in.</p>
            
            <div style="margin: 40px auto; padding: 30px; background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; display: inline-block;">
              <span style="font-size: 56px; font-weight: 900; color: #dc2626; letter-spacing: 15px; font-family: monospace;">${otp}</span>
            </div>
            
            <p style="font-size: 14px; color: #94a3b8; margin-top: 30px;">This code will expire shortly. If you did not request this, please ignore this email.</p>
          </div>
          <div style="background-color: #f1f5f9; padding: 20px; text-align: center;">
            <p style="font-size: 11px; color: #94a3b8; margin: 0; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">&copy; ${new Date().getFullYear()} Dragon Suppliers Nepal. Premium Distribution Hub.</p>
          </div>
        </div>
      `;

      const response = await window.fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': B_KEY,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'Dragon Suppliers', email: 'olidevid203@gmail.com' },
          to: [{ email: email }],
          subject: `${otp} is your Dragon Suppliers access code`,
          htmlContent: htmlContent
        })
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }
};
