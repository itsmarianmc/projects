const USER_AGENT = "MetaFetch-Pro/1.0 (https://github.com/itsmarianmc/projects)";
document.addEventListener('DOMContentLoaded', () => {
	const uaHint = document.getElementById('userAgentHint');
	if (uaHint) uaHint.innerText = `User-Agent: ${USER_AGENT.substring(0, 45)}...`;
});

const searchBtn = document.getElementById('searchBtn');
const songTitleInput = document.getElementById('songTitle');
const artistInput = document.getElementById('artistName');
const coverImg = document.getElementById('coverImage');
const coverStatusSpan = document.getElementById('coverStatus');
const downloadBtn = document.getElementById('downloadBtn');
const jsonCodeBlock = document.getElementById('jsonCodeBlock');
const recordInfoSpan = document.getElementById('recordInfo');
const errorToast = document.getElementById('errorToast');
const errorMsgSpan = document.getElementById('errorMsg');
const albumSelectionArea = document.getElementById('albumSelectionArea');
const albumGrid = document.getElementById('albumGrid');

let currentAlbums = [];
let currentSelectedAlbum = null;
let currentRecordingData = null;
let currentMetadata = null;

function showError(msg, duration = 5000) {
	errorMsgSpan.innerText = msg;
	errorToast.classList.remove('hidden');
	setTimeout(() => errorToast.classList.add('hidden'), duration);
}

function showLoadingState(isLoading) {
	if (isLoading) {
		searchBtn.disabled = true;
		searchBtn.innerHTML = `<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div> Searching...`;
		coverStatusSpan.innerText = "Searching for albums...";
		coverImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 24 24' fill='none' stroke='%234b5563'%3E%3Crect x='2' y='3' width='20' height='16' rx='2'%3E%3C/svg%3E";
		jsonCodeBlock.innerHTML = `<code class="language-json">{\n  "status": "Loading metadata..."\n}</code>`;
		if (window.Prism) Prism.highlightElement(jsonCodeBlock);
		currentMetadata = null;
		downloadBtn.disabled = true;
		recordInfoSpan.innerText = "";
		albumSelectionArea.classList.add('hidden');
		albumGrid.innerHTML = "";
	} else {
		searchBtn.disabled = false;
		searchBtn.innerHTML = `🔍 Search`;
	}
}

function displayJsonPreview(jsonObj) {
	const prettyJson = JSON.stringify(jsonObj, null, 2);
	jsonCodeBlock.innerHTML = `<code class="language-json">${escapeHtml(prettyJson)}</code>`;
	if (window.Prism) Prism.highlightElement(jsonCodeBlock);
}

function escapeHtml(str) {
	return str.replace(/[&<>]/g, function(m) {
		if (m === '&') return '&amp;';
		if (m === '<') return '&lt;';
		if (m === '>') return '&gt;';
		return m;
	});
}

async function loadCoverForAlbum(album) {
	const releaseGroupId = album.releaseGroupId;
	const releaseId = album.releaseId;
	if (!releaseGroupId && !releaseId) {
		coverImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231e293b'/%3E%3Ctext x='50' y='55' font-size='12' text-anchor='middle' fill='%239ca3af'%3E🎵 No Cover%3C/text%3E%3C/svg%3E";
		coverStatusSpan.innerText = "No cover available";
		return false;
	}
	const attempts = [];
	if (releaseGroupId) attempts.push(`https://coverartarchive.org/release-group/${releaseGroupId}/front`);
	if (releaseId) attempts.push(`https://coverartarchive.org/release/${releaseId}/front`);

	for (const url of attempts) {
		try {
			const img = new Image();
			await new Promise((resolve, reject) => {
				img.onload = () => resolve(true);
				img.onerror = reject;
				img.src = url;
			});
			coverImg.src = url;
			coverStatusSpan.innerText = "Cover loaded";
			return true;
		} catch (e) {}
	}
	coverImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231e293b'/%3E%3Ctext x='50' y='55' font-size='12' text-anchor='middle' fill='%239ca3af'%3E🎵 No Cover%3C/text%3E%3C/svg%3E";
	coverStatusSpan.innerText = "No cover available";
	return false;
}

function selectAlbum(album) {
	currentSelectedAlbum = album;

	const metadata = {
		artist: currentRecordingData.artist,
		featured_artists: currentRecordingData.featuredArtists || [],
		title: currentRecordingData.title,
		album: album.title,
		release_date: album.date || "",
		track_number: album.trackNumber || "",
		genres: currentRecordingData.genres || [],
		musicbrainz_id: currentRecordingData.recordingMbid,
		cover_url: album.coverUrl || ""
	};
	currentMetadata = metadata;
	displayJsonPreview(metadata);
	recordInfoSpan.innerText = `MBID: ${currentRecordingData.recordingMbid.substring(0, 8)}... | Album: ${album.title.substring(0, 28)}`;
	downloadBtn.disabled = false;

	loadCoverForAlbum(album);

	document.querySelectorAll('.album-card').forEach(card => {
		card.classList.remove('selected');
		if (card.dataset.albumId === album.id) card.classList.add('selected');
	});
}

function renderAlbumGrid(albums) {
	if (!albums || albums.length === 0) {
		albumSelectionArea.classList.add('hidden');
		return;
	}
	albumSelectionArea.classList.remove('hidden');
	albumGrid.innerHTML = '';

	albums.forEach((album, idx) => {
		const card = document.createElement('div');
		card.className = 'album-card glass-card rounded-xl overflow-hidden border border-gray-700 p-3 text-center';
		card.dataset.albumId = album.id;

		const thumbImg = document.createElement('img');
		thumbImg.className = 'cover-thumb mx-auto mb-2';
		thumbImg.alt = album.title;
		thumbImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 24 24' fill='none' stroke='%236b7280'%3E%3Crect x='2' y='3' width='20' height='16' rx='2'%3E%3C/svg%3E";

		if (album.coverUrl) {
			const testImg = new Image();
			testImg.onload = () => {
				thumbImg.src = album.coverUrl;
			};
			testImg.src = album.coverUrl;
		}

		const titleEl = document.createElement('div');
		titleEl.className = 'text-sm font-semibold truncate mt-1';
		titleEl.textContent = album.title;

		const artistEl = document.createElement('div');
		artistEl.className = 'text-xs text-gray-400 truncate';
		artistEl.textContent = album.artist || currentRecordingData?.artist || '';

		const yearEl = document.createElement('div');
		yearEl.className = 'text-xs text-gray-500 mt-1';
		yearEl.textContent = album.date ? album.date.substring(0, 4) : '????';

		card.appendChild(thumbImg);
		card.appendChild(titleEl);
		card.appendChild(artistEl);
		card.appendChild(yearEl);

		card.addEventListener('click', () => selectAlbum(album));
		albumGrid.appendChild(card);
	});

	if (albums.length > 0) {
		selectAlbum(albums[0]);
	}
}

async function fetchAndPrepareAlbums(title, artist) {
	let queryParts = [];
	if (title && title.trim() !== "") queryParts.push(`recording:"${title.trim()}"`);
	if (artist && artist.trim() !== "") queryParts.push(`artist:"${artist.trim()}"`);
	if (queryParts.length === 0) throw new Error("Please enter at least a song title.");

	const queryString = queryParts.join(" AND ");
	const url = `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(queryString)}&fmt=json&limit=5`;

	const response = await fetch(url, {
		headers: {
			'User-Agent': USER_AGENT,
			'Accept': 'application/json'
		}
	});
	if (!response.ok) throw new Error(`MusicBrainz API error: ${response.status}`);

	const data = await response.json();
	if (!data.recordings || data.recordings.length === 0) {
		throw new Error("No recordings found. Try more precise search terms.");
	}

	let allReleases = [];
	let selectedRecording = null;
	let mainArtist = "";
	let recordingTitle = "";
	let recordingMbid = "";
	let featuredArtists = [];

	for (const rec of data.recordings) {
		if (!rec.releases || rec.releases.length === 0) continue;

		const artistCredit = rec['artist-credit'];
		let recArtist = "Unknown";
		let recFeatured = [];
		if (artistCredit && artistCredit.length > 0) {
			recArtist = artistCredit[0].name || artistCredit[0].artist?.name || "Unknown";
			for (let i = 1; i < artistCredit.length; i++) {
				const fname = artistCredit[i].name || artistCredit[i].artist?.name;
				if (fname) recFeatured.push(fname);
			}
		}

		for (const rel of rec.releases) {
			const rgId = rel['release-group'] ? rel['release-group'].id : null;
			const releaseId = rel.id;
			const releaseTitle = rel.title;
			const releaseDate = rel.date || "";
			const releaseGroup = rel['release-group'];
			const releaseGroupTitle = releaseGroup ? releaseGroup.title : releaseTitle;

			let trackNumber = "";
			if (rel.media) {
				for (const medium of rel.media) {
					if (medium.track && Array.isArray(medium.track)) {
						const match = medium.track.find(t => t.title && t.title.toLowerCase() === (rec.title || "").toLowerCase());
						if (match) {
							trackNumber = match.number;
							break;
						}
					}
				}
			}

			let coverUrl = "";
			if (rgId) coverUrl = `https://coverartarchive.org/release-group/${rgId}/front`;
			else if (releaseId) coverUrl = `https://coverartarchive.org/release/${releaseId}/front`;

			allReleases.push({
				id: `${rgId || releaseId}_${releaseId}`,
				title: releaseTitle,
				releaseGroupTitle: releaseGroupTitle,
				artist: recArtist,
				date: releaseDate,
				trackNumber: trackNumber,
				releaseGroupId: rgId,
				releaseId: releaseId,
				coverUrl: coverUrl,
				recordingArtist: recArtist,
				recordingFeatured: recFeatured,
				recordingTitle: rec.title || title,
				recordingMbid: rec.id
			});
		}

		if (!selectedRecording && rec.releases.length > 0) {
			selectedRecording = rec;
			mainArtist = recArtist;
			featuredArtists = recFeatured;
			recordingTitle = rec.title || title;
			recordingMbid = rec.id;
		}
	}

	if (allReleases.length === 0) {
		throw new Error("No albums found for the matching recordings.");
	}

	const uniqueMap = new Map();
	for (const rel of allReleases) {
		const key = rel.releaseGroupId || rel.releaseId;
		if (!uniqueMap.has(key)) {
			uniqueMap.set(key, rel);
		}
	}

	let uniqueReleases = Array.from(uniqueMap.values());
	uniqueReleases.sort((a, b) => {
		if (a.date && b.date) return b.date.localeCompare(a.date);
		if (a.date) return -1;
		if (b.date) return 1;
		return a.title.localeCompare(b.title);
	});

	const topAlbums = uniqueReleases.slice(0, 5);

	currentRecordingData = {
		artist: mainArtist,
		featuredArtists: featuredArtists,
		title: recordingTitle,
		recordingMbid: recordingMbid,
		genres: []
	};

	return topAlbums;
}

async function enrichWithGenres(recordingMbid) {
	try {
		const url = `https://musicbrainz.org/ws/2/recording/${recordingMbid}?inc=tags&fmt=json`;
		const response = await fetch(url, {
			headers: {
				'User-Agent': USER_AGENT,
				'Accept': 'application/json'
			}
		});
		if (!response.ok) return [];
		const data = await response.json();
		if (!data.tags) return [];
		const sorted = [...data.tags].sort((a, b) => (b.count || 0) - (a.count || 0));
		return sorted.map(t => t.name);
	} catch (err) {
		return [];
	}
}

async function performSearch() {
	const title = songTitleInput.value.trim();
	const artist = artistInput.value.trim();
	if (!title) {
		showError("Please enter a song title.");
		return;
	}

	showLoadingState(true);
	try {
		const albums = await fetchAndPrepareAlbums(title, artist);
		if (!albums || albums.length === 0) throw new Error("No albums found.");

		if (currentRecordingData && currentRecordingData.recordingMbid) {
			const genres = await enrichWithGenres(currentRecordingData.recordingMbid);
			currentRecordingData.genres = genres;
		}

		currentAlbums = albums;
		renderAlbumGrid(albums);

	} catch (err) {
		console.error(err);
		showError(err.message);
		jsonCodeBlock.innerHTML = `<code class="language-json">{\n  "error": "${escapeHtml(err.message)}",\n  "hint": "Try more specific title and artist"\n}</code>`;
		if (window.Prism) Prism.highlightElement(jsonCodeBlock);
		coverStatusSpan.innerText = "No metadata";
		coverImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231e293b'/%3E%3Ctext x='50' y='55' font-size='12' text-anchor='middle' fill='%239ca3af'%3E🎵 No Cover%3C/text%3E%3C/svg%3E";
		currentMetadata = null;
		downloadBtn.disabled = true;
		recordInfoSpan.innerText = "";
		albumSelectionArea.classList.add('hidden');
	} finally {
		showLoadingState(false);
	}
}

function downloadJson() {
	if (!currentMetadata) {
		showError("No metadata to download.");
		return;
	}
	let artistClean = (currentMetadata.artist || "unknown").replace(/[<>:"/\\|?*]/g, '_');
	let titleClean = (currentMetadata.title || "track").replace(/[<>:"/\\|?*]/g, '_');
	let filename = `${artistClean} - ${titleClean}.json`;
	const jsonString = JSON.stringify(currentMetadata, null, 2);
	const blob = new Blob([jsonString], {
		type: "application/json"
	});
	const link = document.createElement('a');
	const url = URL.createObjectURL(blob);
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
	const oldText = downloadBtn.innerHTML;
	downloadBtn.innerHTML = "Saved!";
	setTimeout(() => {
		downloadBtn.innerHTML = "Download JSON";
	}, 1500);
}

searchBtn.addEventListener('click', performSearch);
downloadBtn.addEventListener('click', downloadJson);
const handleEnter = (e) => {
	if (e.key === 'Enter') performSearch();
};
songTitleInput.addEventListener('keypress', handleEnter);
artistInput.addEventListener('keypress', handleEnter);

jsonCodeBlock.innerHTML = `<code class="language-json">{\n  "ready": "Enter a song title and click Search",\n  "example": "Ti penso sempre + Chiello"\n}</code>`;
if (window.Prism) Prism.highlightElement(jsonCodeBlock);
downloadBtn.disabled = true;
coverStatusSpan.innerText = "Ready to search";
