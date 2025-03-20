import { supabase } from './supabase';
import { corsMiddleware } from './cors';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Missing code' });
    }

    const { error } = await supabase
      .from('Database')
      .update({
        isActive: false,
        deviceId: null
      })
      .eq('code', code);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ success: false, error: 'Failed to deactivate code' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ success: false, error: 'Server error deactivating code' });
  }
}

export default corsMiddleware(handler);
