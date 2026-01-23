// Standard Vite environment variable access.
const getEnv = (key: string): string => {
  return (import.meta as any).env?.[key] || '';
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SUPABASE_KEY = getEnv('VITE_SUPABASE_KEY');
const BREVO_KEY = getEnv('VITE_BREVO_API_KEY');

// Helper to normalize data for Supabase (handles both camelCase and snake_case mapping)
const normalizeToDB = (data: any) => {
  const mapping: Record<string, string> = {
    'shopName': 'shop_name',
    'createdAt': 'created_at',
    'id': 'id',
    'email': 'email',
    'phone': 'phone',
    'address': 'address',
    'role': 'role',
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
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error("Supabase config missing.");
      return [];
    }
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      return Array.isArray(data) ? data.map(normalizeFromDB) : [];
    } catch (e) {
      console.error(`Fetch error (${table}):`, e);
      return [];
    }
  },

  async upsert(table: string, data: any) {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    try {
      const dbData = normalizeToDB(data);
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
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
        const err = await response.text();
        console.warn(`Upsert failed, attempting fallback POST: ${err}`);
        // Fallback to simple POST if upsert headers fail
        await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dbData)
        });
      }
    } catch (e) {
      console.error(`Network error upserting to ${table}:`, e);
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dbData)
      });
      if (!response.ok) console.error(`Update Error:`, await response.text());
    } catch (e) {
      console.error(`Network error updating ${table}:`, e);
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
    } catch (e) {
      console.error(`Error deleting from ${table}:`, e);
    }
  }
};

export const EmailService = {
  async sendOTP(email: string, otp: string) {
    if (!BREVO_KEY) {
      console.error('ERROR: VITE_BREVO_API_KEY is missing.');
      return false;
    }
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
              <p style="text-align: center; color: #94a3b8;">Use the code below to access your merchant terminal:</p>
              <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; text-align: center; margin: 30px 0;">
                <span style="font-size: 40px; font-weight: 800; color: #ffffff; letter-spacing: 10px;">${otp}</span>
              </div>
              <p style="font-size: 12px; color: #475569; text-align: center;">This code is valid for one-time use only.</p>
            </div>
          `
        })
      });
      return response.ok;
    } catch (e) {
      console.error('Email dispatch error:', e);
      return false;
    }
  }
};