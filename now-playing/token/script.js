function getSelectedScopes() {
	const checkboxes = document.querySelectorAll('input[name="scope"]:checked');
	return Array.from(checkboxes).map(cb => cb.value).join(' ');
}

function getAccessCode() {
	const clientId = document.getElementById('clientId').value.trim();
	const clientSecret = document.getElementById('clientSecret').value.trim();
	const redirectUri = document.getElementById('redirectUri').value.trim();
	const scopes = getSelectedScopes();

	if (!clientId || !clientSecret || !redirectUri) {
		alert('Fill out all required fields.');
		return;
	}

	const credentials = {
		clientId,
		clientSecret
	};
	localStorage.setItem('spotifyCredentials', JSON.stringify(credentials));

	localStorage.setItem('spotify_client_id', clientId);
	localStorage.setItem('spotify_client_secret', clientSecret);
	localStorage.setItem('spotify_redirect_uri', redirectUri);

	const authUrl = new URL('https://accounts.spotify.com/authorize');
	authUrl.searchParams.set('client_id', clientId);
	authUrl.searchParams.set('response_type', 'code');
	authUrl.searchParams.set('redirect_uri', redirectUri);
	if (scopes) authUrl.searchParams.set('scope', scopes);

	window.location.href = authUrl.toString();
}

async function exchangeCodeForToken(code) {
	const clientId = localStorage.getItem('spotify_client_id');
	const clientSecret = localStorage.getItem('spotify_client_secret');
	const redirectUri = localStorage.getItem('spotify_redirect_uri');

	if (!clientId || !clientSecret || !redirectUri) {
		showTokenError('Fehlende Authentifizierungsdaten. Bitte starte den Vorgang neu.');
		return;
	}

	const tokenUrl = 'https://accounts.spotify.com/api/token';
	const body = new URLSearchParams({
		grant_type: 'authorization_code',
		code: code,
		redirect_uri: redirectUri,
		client_id: clientId,
		client_secret: clientSecret
	});

	try {
		const response = await fetch(tokenUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: body
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.error_description || data.error || 'Error exchanging code for token');
		}

		showTokenSuccess(data);

		const cleanUrl = window.location.origin + window.location.pathname;
		window.history.replaceState({}, document.title, cleanUrl);

	} catch (error) {
		showTokenError(error.message);
	}
}

function showTokenSuccess(tokenData) {
	const displayDiv = document.getElementById('token-display');
	displayDiv.style.display = 'block';
	displayDiv.innerHTML = `
                <h4>✅ Token successfully obtained!</h4>
                <p><strong>Access Token:</strong><br> <code>${tokenData.access_token}</code></p>
                <p><strong>Refresh Token:</strong><br> <code>${tokenData.refresh_token || 'No refresh token (maybe missing scopes?)'}</code></p>
                <p><strong>Expires in:</strong> ${tokenData.expires_in} seconds</p>
                <p><strong>Scope:</strong> ${tokenData.scope || '-'}</p>
            `;
	const refreshToken = tokenData.refresh_token || '';
	const clientId = localStorage.getItem('spotify_client_id');
	const clientSecret = localStorage.getItem('spotify_client_secret');
	const credentials = {
		clientId,
		clientSecret,
		refreshToken
	};
	localStorage.setItem('spotifyCredentials', JSON.stringify(credentials));
	console.log('Access Token:', tokenData.access_token);
}

function showTokenError(message) {
	const displayDiv = document.getElementById('token-display');
	displayDiv.style.display = 'block';
	displayDiv.innerHTML = `<p style="color:red;">Error: ${message}</p>`;
}

window.addEventListener('load', function() {
	const urlParams = new URLSearchParams(window.location.search);
	const code = urlParams.get('code');
	const error = urlParams.get('error');

	if (error) {
		showTokenError(`Spotify-Fehler: ${error}`);
		return;
	}

	if (code) {
		exchangeCodeForToken(code);
	}
});
