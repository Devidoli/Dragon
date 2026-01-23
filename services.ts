// Standard Vite environment variable access.
const getEnv = (key: string): string => {
  return (import.meta as any).env?.[key] || '';
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SUPABASE_KEY = getEnv('VITE_SUPABASE_KEY');
const BREVO_KEY = getEnv('VITE_BREVO_API_KEY');

// Robust mapping to handle both camelCase and snake_case database schemas
const normalizeToDB = (data: any) => {
  const mapping: Record<string, string> = {
    'shopName': 'shop_name',
    'createdAt': 'created_at',
  };
  
  const normalized: any = { ...data };
  Object.keys(mapping).forEach(key => {
    if (data[key] !== undefined) {
      normalized[mapping[key]] = data[key];
    }
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
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error("SUPABASE ERROR: Environment variables missing. Check your Vercel/Local settings.");
      return [];
    }
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const err = await response.text();
        console.error(`SUPABASE FETCH ERROR [${table}]:`, response.status, err);
        return [];
      }
      
      const data = await response.json();
      return Array.isArray(data) ? data.map(normalizeFromDB) : [];
    } catch (e) {
      console.error(`NETWORK ERROR fetching ${table}:`, e);
      return [];
    }
  },

  async fetchUserByEmail(email: string) {
    if (!SUPABASE_URL || !SUPABASE_KEY) return null;
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${email.toLowerCase()}&select=*`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data && data[0] ? normalizeFromDB(data[0]) : null;
    } catch (e) {
      return null;
    }
  },

  async upsert(table: string, data: any) {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    try {
      const dbData = normalizeToDB(data);
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=id`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates, return=representation'
        },
        body: JSON.stringify(dbData)
      });
      
      if (!response.ok) {
        const err = await response.text();
        console.error(`SUPABASE UPSERT ERROR [${table}]:`, response.status, err);
        console.info("TIP: If status is 401/403, check your Supabase RLS policies for INSERT access.");
      }
    } catch (e) {
      console.error(`NETWORK ERROR during upsert to ${table}:`, e);
    }
  },

  async update(table: string, id: string, data: any) {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    try {
      const dbData = normalizeToDB(data);
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(dbData)
      });
      
      if (!response.ok) {
        const err = await response.text();
        console.error(`SUPABASE UPDATE ERROR [${table}]:`, response.status, err);
      }
    } catch (e) {
      console.error(`NETWORK ERROR during update to ${table}:`, e);
    }
  },

  async delete(table: string, id: string) {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
    } catch (e) {}
  }
};

export const EmailService = {
  async sendOTP(email: string, otp: string) {
    if (!BREVO_KEY) return false;
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': BREVO_KEY,
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