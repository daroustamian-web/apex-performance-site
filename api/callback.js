// Decap CMS GitHub OAuth — step 2: exchange the auth code for an access token,
// then post it back to the Decap CMS opener window via postMessage.

export default async function handler(req, res) {
  const code = req.query && req.query.code;
  if (!code) {
    res.status(400).send('Missing code parameter');
    return;
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.status(500).send('Missing GITHUB_OAUTH env vars');
    return;
  }

  let tokenData;
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code })
    });
    tokenData = await tokenRes.json();
  } catch (err) {
    res.status(502).send(`GitHub token exchange failed: ${err.message}`);
    return;
  }

  if (tokenData.error) {
    res.status(400).send(`GitHub error: ${tokenData.error_description || tokenData.error}`);
    return;
  }

  const payload = JSON.stringify({ token: tokenData.access_token, provider: 'github' });
  const successMessage = `authorization:github:success:${payload}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).end(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Authorized</title></head>
<body style="font-family: -apple-system, sans-serif; background:#0A0A0C; color:#EDEDF0; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0">
<div style="text-align:center">
  <p>Authorizing... You can close this window.</p>
</div>
<script>
  (function() {
    function receiveMessage(e) {
      window.opener.postMessage(${JSON.stringify(successMessage)}, e.origin);
      window.removeEventListener("message", receiveMessage, false);
    }
    window.addEventListener("message", receiveMessage, false);
    window.opener.postMessage("authorizing:github", "*");
  })();
</script>
</body></html>`);
}
