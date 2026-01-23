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
      console.warn(`Supabase credentials missing for table: ${table}. Check your Vercel environment variables.`);
      return [];
    }
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error(`Error fetching ${table}:`, e);
      return [];
    }
  },

  async upsert(table: string, data: any) {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(data)
      });
    } catch (e) {
      console.error(`Error upserting to ${table}:`, e);
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
    console.log(`[EmailService] Dispatching OTP ${otp} to ${email}`);
    
    if (!BREVO_KEY) {
      console.error('ERROR: VITE_BREVO_API_KEY is missing. Code will not be sent.');
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

      if (!response.ok) {
        const errData = await response.json();
        console.error('Brevo API Error:', errData);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Connection error during email dispatch:', e);
      return false;
    }
  }
};