// Decap CMS GitHub OAuth — step 1: redirect user to GitHub's authorize screen.
// Vercel serverless function. Reads GITHUB_OAUTH_CLIENT_ID from env.

export default function handler(req, res) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) {
    res.status(500).send('Missing GITHUB_OAUTH_CLIENT_ID env var');
    return;
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const redirectUri = `${proto}://${host}/api/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'repo',
    state: (req.query && req.query.state) ? String(req.query.state) : ''
  });

  res.writeHead(302, { Location: `https://github.com/login/oauth/authorize?${params.toString()}` });
  res.end();
}
