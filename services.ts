/**
 * Dragon Suppliers Service Layer - Commercial Production Version
 * 
 * Safety check added for import.meta to prevent crashes in non-Vite environments.
 */

// Deeply defensive access to prevent "Cannot read properties of undefined"
// We ensure we always have an object to read from, even if it's empty.
const env: any = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

const S_URL = env.VITE_SUPABASE_URL;
const S_KEY = env.VITE_SUPABASE_KEY;
const B_KEY = env.VITE_BREVO_API_KEY;

export const SupabaseConfig = {
  isConfigured: !!(S_URL && S_KEY),
  url: S_URL || "NONE",
};

// Console diagnostics for the owner
if (SupabaseConfig.isConfigured) {
  console.log("DRAGON CONFIG: Active. Database connection established.");
} else {
  console.warn("DRAGON CONFIG: Demo Mode. Missing environment variables or non-Vite environment detected.");
}

const normalizeToDB = (data: any) => {
  const mapping: Record<string, string> = {
    'shopName': 'shop_name',
    'createdAt': 'created_at',
    'customerId': 'customer_id',
    'customerEmail': 'customer_email',
    'productId': 'product_id',
    'productName': 'product_name',
    'paymentMethod': 'payment_method',
    'status': 'status'
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
    id: data.id,
    email: data.email,
    phone: data.phone,
    shopName: data.shop_name || data.shopName,
    address: data.address,
    role: data.role,
    status: data.status,
    createdAt: data.created_at || data.createdAt
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
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data.map(normalizeFromDB) : [];
    } catch (e) {
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
      if (!response.ok) return null;
      const data = await response.json();
      return data && data[0] ? normalizeFromDB(data[0]) : null;
    } catch (e) {
      return null;
    }
  },

  async upsert(table: string, data: any): Promise<boolean> {
    if (!SupabaseConfig.isConfigured) return false;
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
      return response.ok;
    } catch (e) {
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
        const errorMsg = await response.text();
        console.error(`SUPABASE UPDATE FAILED: ${response.status} - ${errorMsg}`);
        return false;
      }
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
    if (!B_KEY) return false;
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