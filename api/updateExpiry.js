import { supabase } from './supabase';
import { corsMiddleware } from './cors';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, expiryDate } = req.body;

    if (!code || !expiryDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const cleanCode = code.replace(/-/g, '').toUpperCase();

    const { error } = await supabase
      .from('Database')
      .update({ activeTill: expiryDate })
      .eq('code', cleanCode);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ success: false, error: 'Failed to update expiry date' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ success: false, error: 'Server error updating expiry date' });
  }
}

export default corsMiddleware(handler);
