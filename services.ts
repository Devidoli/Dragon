
/**
 * Dragon Suppliers Service Layer - MongoDB Atlas Data API Version
 */

const env: any = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

const M_KEY = env.VITE_MONGODB_API_KEY;
const M_URL = env.VITE_MONGODB_URL; // Base URL: https://.../endpoint/data/v1
const M_CLUSTER = env.VITE_MONGODB_CLUSTER || 'Cluster0';
const M_DB = env.VITE_MONGODB_DATABASE || 'dragon_suppliers';
const B_KEY = env.VITE_BREVO_API_KEY;

// Fix: Renamed to SupabaseConfig for compatibility with existing imports in App.tsx
export const SupabaseConfig = {
  isConfigured: !!(M_KEY && M_URL),
  database: M_DB,
};

const mongoRequest = async (action: string, collection: string, body: any) => {
  // Fix: Updated reference from DBConfig to SupabaseConfig
  if (!SupabaseConfig.isConfigured) return null;
  try {
    const response = await fetch(`${M_URL}/action/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Request-Headers': '*',
        'api-key': M_KEY,
      },
      body: JSON.stringify({
        dataSource: M_CLUSTER,
        database: M_DB,
        collection: collection,
        ...body
      })
    });
    if (!response.ok) {
      const err = await response.text();
      console.error(`MongoDB ${action} error:`, err);
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error(`MongoDB ${action} network error:`, e);
    return null;
  }
};

export const SupabaseService = { // Keeping name for compatibility with App.tsx imports
  async fetchTable(collection: string) {
    const result = await mongoRequest('find', collection, { filter: {} });
    return result?.documents || [];
  },

  async fetchUserByEmail(email: string) {
    const result = await mongoRequest('findOne', 'users', { 
      filter: { email: email.toLowerCase() } 
    });
    return result?.document || null;
  },

  async upsert(collection: string, data: any): Promise<boolean> {
    // MongoDB Atlas Data API doesn't have a direct upsert action in one simple call like Supabase
    // We use updateOne with upsert: true
    const result = await mongoRequest('updateOne', collection, {
      filter: { id: data.id },
      update: { $set: data },
      upsert: true
    });
    return !!result;
  },

  async update(collection: string, id: string, data: any): Promise<boolean> {
    const result = await mongoRequest('updateOne', collection, {
      filter: { id: id },
      update: { $set: data }
    });
    return result && result.matchedCount > 0 || result?.modifiedCount > 0;
  },

  async delete(collection: string, id: string): Promise<boolean> {
    const result = await mongoRequest('deleteOne', collection, {
      filter: { id: id }
    });
    return !!result;
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
