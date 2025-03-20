export function corsMiddleware(handler) {
  return async (req, res) => {
    // Set CORS headers immediately
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    // Handle preflight requests immediately
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    try {
      // Call the actual handler inside try-catch
      return await handler(req, res);
    } catch (error) {
      console.error('Handler error:', error);
      // Even on error, ensure CORS headers are set
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
