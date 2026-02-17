const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_NOW_PLAYING_URL = 'https://api.spotify.com/v1/me/player/currently-playing';
const SPOTIFY_RECENTLY_PLAYED_URL = 'https://api.spotify.com/v1/me/player/recently-played?limit=1';

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken(clientId, clientSecret, refreshToken) {
    const now = Date.now();

    if (cachedToken && now < tokenExpiresAt - 30000) {
        return cachedToken;
    }

    const basic = btoa(clientId + ':' + clientSecret);

    const res = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: {
            Authorization: 'Basic ' + basic,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }),
    });

    const data = await res.json();
    if (!data.access_token) {
        throw new Error(data.error_description || 'Failed to obtain access token');
    }

    cachedToken = data.access_token;
    tokenExpiresAt = now + (data.expires_in || 600) * 1000;

    return cachedToken;
}

function formatTrack(song, isRecentFallback) {
    const item = isRecentFallback ? song.track : song.item;

    return {
        playing: isRecentFallback ? false : song.is_playing,
        recently_played: isRecentFallback,
        ...(isRecentFallback
            ? { played_at: song.played_at }
            : {
                timestamp: song.timestamp,
                progress_ms: song.progress_ms,
            }),

        track: {
            id: item.id,
            name: item.name,
            duration_ms: item.duration_ms,
            explicit: item.explicit,
            popularity: item.popularity,
            track_number: item.track_number,
            type: item.type,
            uri: item.uri,
            is_local: item.is_local,
            spotify_url: item.external_urls.spotify,
            preview_url: item.preview_url,
            isrc: item.external_ids?.isrc,
        },

        artists: item.artists.map(function(artist) {
            return {
                id: artist.id,
                name: artist.name,
                uri: artist.uri,
                spotify_url: artist.external_urls.spotify,
            };
        }),

        album: {
            id: item.album.id,
            name: item.album.name,
            album_type: item.album.album_type,
            total_tracks: item.album.total_tracks,
            release_date: item.album.release_date,
            release_date_precision: item.album.release_date_precision,
            uri: item.album.uri,
            spotify_url: item.album.external_urls.spotify,
            images: item.album.images.map(function(img) {
                return { url: img.url, height: img.height, width: img.width };
            }),
            artists: item.album.artists.map(function(artist) {
                return {
                    id: artist.id,
                    name: artist.name,
                    uri: artist.uri,
                    spotify_url: artist.external_urls.spotify,
                };
            }),
        },

        ...(!isRecentFallback ? {
            context: song.context ? {
                type: song.context.type,
                uri: song.context.uri,
                spotify_url: song.context.external_urls?.spotify,
            } : null,

            device: song.device ? {
                id: song.device.id,
                is_active: song.device.is_active,
                is_private_session: song.device.is_private_session,
                is_restricted: song.device.is_restricted,
                name: song.device.name,
                type: song.device.type,
                volume_percent: song.device.volume_percent,
                supports_volume: song.device.supports_volume,
            } : null,

            actions: song.actions ? { disallows: song.actions.disallows } : null,

            shuffle_state: song.shuffle_state,
            repeat_state: song.repeat_state,
            currently_playing_type: song.currently_playing_type,

            progress_percent: item.duration_ms > 0
                ? ((song.progress_ms / item.duration_ms) * 100).toFixed(2)
                : 0,

            remaining_ms: item.duration_ms - song.progress_ms,
            estimated_end_time: song.timestamp + (item.duration_ms - song.progress_ms),
        } : {}),
    };
}

async function fetchNowPlayingFromSpotify(clientId, clientSecret, refreshToken) {
    const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

    const nowPlayingRes = await fetch(SPOTIFY_NOW_PLAYING_URL, {
        headers: { Authorization: 'Bearer ' + accessToken },
    });

    if (nowPlayingRes.status !== 204) {
        const song = await nowPlayingRes.json();
        if (song && song.item) {
            return formatTrack(song, false);
        }
    }

    const recentRes = await fetch(SPOTIFY_RECENTLY_PLAYED_URL, {
        headers: { Authorization: 'Bearer ' + accessToken },
    });

    if (recentRes.status === 200) {
        const recentData = await recentRes.json();
        if (recentData.items && recentData.items.length > 0) {
            return formatTrack(recentData.items[0], true);
        }
    }

    return { playing: false, recently_played: false };
}