// Securely access environment variables via Vite's import.meta.env
// In production (Vercel), these are injected during the build process.
// Ensure your Vercel project has VITE_SUPABASE_URL, VITE_SUPABASE_KEY, and VITE_BREVO_API_KEY set.

const getEnv = (key: string): string => {
  return (import.meta as any).env?.[key] || '';
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SUPABASE_KEY = getEnv('VITE_SUPABASE_KEY');
const BREVO_KEY = getEnv('VITE_BREVO_API_KEY');

export const SupabaseService = {
  async fetchTable(table: string) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.warn(`Supabase credentials missing for table: ${table}. Check your .env or Vercel settings.`);
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
    if (!BREVO_KEY) {
      console.error('Brevo API key (VITE_BREVO_API_KEY) is missing. Email cannot be sent.');
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
          subject: 'Your Dragon Suppliers Verification Code',
          htmlContent: `
            <div style="font-family: sans-serif; padding: 40px; background-color: #0f172a; border-radius: 32px; color: #ffffff; max-width: 500px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.1);">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="background: linear-gradient(135deg, #dc2626 0%, #d97706 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -1px;">DRAGON SUPPLIERS</h1>
                <p style="color: #64748b; margin-top: 4px; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 3px;">Official B2B Network</p>
              </div>
              <p style="font-size: 16px; font-weight: 500; color: #94a3b8; text-align: center;">Enter the following secure code to access the terminal:</p>
              <div style="background: rgba(255,255,255,0.05); padding: 32px; border-radius: 24px; text-align: center; margin: 32px 0; border: 1px solid rgba(255,255,255,0.1);">
                <span style="font-size: 56px; font-weight: 900; letter-spacing: 12px; color: #ef4444; font-family: monospace;">${otp}</span>
              </div>
              <p style="font-size: 12px; color: #475569; text-align: center; line-height: 1.6;">SECURITY PROTOCOL: Do not share this code. Valid for one-time use only.</p>
            </div>
          `
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Email API Error:', errorData);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Network error sending email:', e);
      return false;
    }
  }
};
