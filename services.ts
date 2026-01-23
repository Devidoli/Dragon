// Standard Vite environment variable access.
const getEnv = (key: string): string => {
  return (import.meta as any).env?.[key] || '';
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SUPABASE_KEY = getEnv('VITE_SUPABASE_KEY');
const BREVO_KEY = getEnv('VITE_BREVO_API_KEY');

// Robust mapping for DB columns to ensure no data loss
const normalizeToDB = (data: any) => {
  const mapping: Record<string, string> = {
    'shopName': 'shop_name',
    'createdAt': 'created_at',
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
    if (!SUPABASE_URL || !SUPABASE_KEY) return [];
    try {
      // Adding no-cache to ensure we get the latest data from the server
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data.map(normalizeFromDB) : [];
    } catch (e) {
      console.error(`Fetch error:`, e);
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
      // Crucial: on_conflict=id tells Supabase how to handle existing records
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=id`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates, return=minimal'
        },
        body: JSON.stringify(dbData)
      });
      if (!response.ok) {
        console.error(`DB Upsert Error:`, await response.text());
      }
    } catch (e) {
      console.error(`Network error:`, e);
    }
  },

  async update(table: string, id: string, data: any) {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    try {
      const dbData = normalizeToDB(data);
      await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dbData)
      });
    } catch (e) {}
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
          htmlContent: `
            <div style="font-family: sans-serif; padding: 40px; background-color: #0f172a; color: #ffffff; max-width: 500px; margin: 0 auto; border-radius: 20px;">
              <h1 style="color: #ef4444; text-align: center; font-size: 24px;">DRAGON SUPPLIERS</h1>
              <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; text-align: center; margin: 30px 0;">
                <span style="font-size: 40px; font-weight: 800; color: #ffffff; letter-spacing: 10px;">${otp}</span>
              </div>
            </div>
          `
        })
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }
};