
/**
 * Dragon Suppliers Service Layer - Supabase Production Version
 */

const env: any = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

const S_URL = env.VITE_SUPABASE_URL;
const S_KEY = env.VITE_SUPABASE_KEY;
const B_KEY = env.VITE_BREVO_API_KEY;

export const SupabaseConfig = {
  isConfigured: !!(S_URL && S_KEY),
  url: S_URL || "NONE",
};

// Field mapping for Supabase (CamelCase to Snake_Case)
const normalizeToDB = (data: any) => {
  const mapping: Record<string, string> = {
    'shopName': 'shop_name',
    'createdAt': 'created_at',
    'customerId': 'customer_id',
    'customerEmail': 'customer_email',
    'productId': 'product_id',
    'productName': 'product_name',
    'paymentMethod': 'payment_method'
  };
  
  const normalized: any = {};
  Object.keys(data).forEach(key => {
    const dbKey = mapping[key] || key;
    normalized[dbKey] = data[key];
  });
  return normalized;
};

const normalizeFromDB = (data: any) => {
  if (!data) return data;
  return {
    ...data,
    shopName: data.shop_name || data.shopName,
    createdAt: data.created_at || data.createdAt,
    productId: data.product_id || data.productId,
    productName: data.product_name || data.productName,
    customerEmail: data.customer_email || data.customerEmail,
    customerId: data.customer_id || data.customerId
  };
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
      return Array.isArray(data) ? data.map(normalizeFromDB) : [];
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
      return data && data[0] ? normalizeFromDB(data[0]) : null;
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
      const dbData = normalizeToDB(data);
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
      console.log(`Successfully synced record to ${table}`);
      return true;
    } catch (e) {
      console.error(`Supabase Sync Error (${table}):`, e);
      return false;
    }
  },

  async update(table: string, id: string, data: any): Promise<boolean> {
    if (!SupabaseConfig.isConfigured) return false;
    try {
      const dbData = normalizeToDB(data);
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
      
      if (!response.ok) {
        const errText = await response.text();
        console.error(`Supabase Patch Error (${table}):`, response.status, errText);
        return false;
      }
      return true;
    } catch (e) {
      console.error(`Network error during update (${table}):`, e);
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
    if (!B_KEY) {
      console.warn("Email service not configured. Test Code: ", otp);
      return true; 
    }
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
          htmlContent: `<div style="padding:40px;background:#0f172a;color:#fff;border-radius:20px;text-align:center;"><h1 style="color:#ef4444;">DRAGON</h1><div style="font-size:40px;margin:20px 0;letter-spacing:10px;font-weight:bold;">${otp}</div></div>`
        })
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }
};
