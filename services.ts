// Standard Vite environment variable access.
// Ensure these variables are prefixed with VITE_ in your Vercel Project Settings.

const getEnv = (key: string): string => {
  return (import.meta as any).env?.[key] || '';
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SUPABASE_KEY = getEnv('VITE_SUPABASE_KEY');
const BREVO_KEY = getEnv('VITE_BREVO_API_KEY');

export const SupabaseService = {
  async fetchTable(table: string) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error(`Supabase config missing. URL: ${!!SUPABASE_URL}, Key: ${!!SUPABASE_KEY}`);
      return [];
    }
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      if (!response.ok) {
        const err = await response.text();
        console.error(`Supabase Fetch Error (${table}):`, err);
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error(`Network error fetching ${table}:`, e);
      return [];
    }
  },

  async upsert(table: string, data: any) {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    try {
      // We use POST with resolution=merge-duplicates for standard PostgREST upsert
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates, return=representation'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const err = await response.text();
        console.error(`Supabase Upsert Error (${table}):`, err);
      }
    } catch (e) {
      console.error(`Network error upserting to ${table}:`, e);
    }
  },

  async update(table: string, id: string, data: any) {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const err = await response.text();
        console.error(`Supabase Update Error (${table}):`, err);
      }
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
              <p style="font-size: 12px; color: #475569; text-align: center;">This code is valid for one-time use only. Do not share it with anyone.</p>
            </div>
          `
        })
      });

      return response.ok;
    } catch (e) {
      console.error('Connection error during email dispatch:', e);
      return false;
    }
  }
};