const DB_NAME = 'SonicBloom_DB';
const STORE_NAME = 'audio_files';
const METADATA_KEY = 'sonicbloom_metadata';

let db = null;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onerror = (event) => {
            console.error("Database error:", event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

function saveAudioToDB(songId, file) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(file, songId);

        request.onsuccess = () => resolve();
        request.onerror = (event) => {
            console.error("Error saving audio:", event.target.error);
            reject(event.target.error);
        };
    });
}

function getAudioFromDB(songId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }

        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(songId);

        request.onsuccess = (event) => {
            const file = event.target.result;
            if (file) {
                resolve(file);
            } else {
                reject('File not found');
            }
        };

        request.onerror = (event) => {
            console.error("Error loading audio:", event.target.error);
            reject(event.target.error);
        };
    });
}

function deleteAudioFromDB(songId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(songId);

        request.onsuccess = () => resolve();
        request.onerror = (event) => {
            console.error("Error deleting audio:", event.target.error);
            reject(event.target.error);
        };
    });
}

function arePreferencesAllowed() {
    const saved = localStorage.getItem('cookieSettings');
    if (!saved) return false;
    try {
        const settings = JSON.parse(saved);
        return settings.preferences === true;
    } catch (e) {
        return false;
    }
}

function showStorageDisabledMessage() {
    const message = document.createElement('div');
    message.className = 'empty-state';
    message.innerHTML = `
        <i class="fas fa-exclamation-triangle" style="color: var(--warning);"></i>
        <p>Storage is disabled</p>
        <p>Enable "Preferences" in cookie settings to save your music</p>
    `;

    const playlist = document.getElementById('playlist');
    playlist.innerHTML = '';
    playlist.appendChild(message);
}

document.addEventListener('DOMContentLoaded', async function() {
    try {
        await openDB();
        console.log("Database initialized");
    } catch (error) {
        console.error("Database initialization error:", error);
        alert("Error initializing database. Please reload the page.");
    }

    const audioPlayer = new Audio();
    let isPlaying = false;
    let currentSongIndex = -1;
    let playlistSongs = [];
    let folders = [{
            id: 'all',
            name: 'All Songs',
            icon: 'fa-music'
        },
        {
            id: 'favorites',
            name: 'Favorites',
            icon: 'fa-star'
        }
    ];
    let currentFolder = 'all';

    const fileUpload = document.getElementById('file-upload');
    const uploadTrigger = document.getElementById('upload-trigger');
    const playlist = document.getElementById('playlist');
    const foldersList = document.getElementById('folders-list');
    const playBtn = document.getElementById('play-btn');
    const footerPlayBtn = document.getElementById('footer-play-btn');
    const playIcon = playBtn.querySelector('i');
    const footerPlayIcon = footerPlayBtn.querySelector('i');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const footerPrevBtn = document.getElementById('footer-prev-btn');
    const footerNextBtn = document.getElementById('footer-next-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const progressBar = document.querySelector('.progress');
    const currentTimeEl = document.querySelector('.current-time');
    const totalTimeEl = document.querySelector('.total-time');
    const clearBtn = document.getElementById('clear-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const addFolderBtn = document.getElementById('add-folder-btn');
    const folderModal = document.getElementById('folder-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const cancelFolderBtn = document.getElementById('cancel-folder');
    const createFolderBtn = document.getElementById('create-folder');
    const folderNameInput = document.getElementById('folder-name');
    const folderIconSelect = document.getElementById('folder-icon');
    const addToFavoritesBtn = document.getElementById('add-to-favorites');

    const cookieBanner = document.querySelector('.cookie-banner');
    if (cookieBanner) {
        cookieBanner.style.display = 'none';
    }

    uploadTrigger.addEventListener('click', () => {
        fileUpload.click();
    });

    fileUpload.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            if (!arePreferencesAllowed()) {
                alert('Please enable "Preferences" in cookie settings to save your music library.');
                return;
            }

            if (playlist.querySelector('.empty-state')) {
                playlist.innerHTML = '';
            }

            for (const file of files) {
                await addSongToPlaylist(file);
            }

            saveToLocalStorage();
        }
    });

    async function addSongToPlaylist(file) {
        if (!file.type.startsWith('audio/')) {
            alert(`"${file.name}" is not an audio file!`);
            return;
        }

        const songId = 'song-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        try {
            await saveAudioToDB(songId, file);
        } catch (error) {
            console.error("Error saving audio:", error);
            alert("Error saving audio file. Please try again.");
            return;
        }

        const url = URL.createObjectURL(file);

        const song = {
            id: songId,
            title: file.name.replace(/\.[^/.]+$/, ""),
            artist: "Unknown Artist",
            duration: 0,
            url: url,
            metaLoaded: false,
            favorite: false,
            folder: 'all'
        };

        playlistSongs.push(song);

        const li = document.createElement('li');
        li.className = 'playlist-item';
        li.dataset.songId = songId;

        li.innerHTML = `
            <i class="fas fa-music song-icon"></i>
            <div class="song-info">
                <div class="song-title">${song.title}</div>
                <div class="song-artist">${song.artist}</div>
            </div>
            <div class="song-duration">${formatTime(song.duration)}</div>
            <div class="song-actions">
                <button class="song-action-btn favorite-btn" title="Add to favorites">
                    <i class="far fa-star"></i>
                </button>
            </div>
        `;

        li.addEventListener('click', (e) => {
            if (!e.target.closest('.song-action-btn')) {
                const songId = li.dataset.songId;
                const index = playlistSongs.findIndex(s => s.id === songId);
                if (index !== -1) {
                    playSong(index);
                }
            }
        });

        const favoriteBtn = li.querySelector('.favorite-btn');
        favoriteBtn.addEventListener('click', () => {
            const songId = li.dataset.songId;
            const song = playlistSongs.find(s => s.id === songId);
            if (song) {
                song.favorite = !song.favorite;
                favoriteBtn.innerHTML = `<i class="${song.favorite ? 'fas' : 'far'} fa-star"></i>`;
                favoriteBtn.title = song.favorite ? "Remove from favorites" : "Add to favorites";
                updateFolders();
                saveToLocalStorage();
            }
        });

        playlist.appendChild(li);
        readMetadata(song, file);
        saveToLocalStorage();
    }

    function readMetadata(song, file) {
        new jsmediatags.Reader(file)
            .setTagsToRead(["title", "artist", "album", "picture"])
            .read({
                onSuccess: function(tag) {
                    if (tag.tags.title) {
                        song.title = tag.tags.title;
                    }

                    if (tag.tags.artist) {
                        song.artist = tag.tags.artist;
                    }

                    if (tag.tags.picture) {
                        const base64String = btoa(
                            new Uint8Array(tag.tags.picture.data)
                            .reduce((data, byte) => data + String.fromCharCode(byte), '')
                        );
                        song.cover = `data:${tag.tags.picture.format};base64,${base64String}`;
                    }

                    const audio = new Audio();
                    audio.src = song.url;
                    audio.onloadedmetadata = () => {
                        song.duration = audio.duration;
                        song.metaLoaded = true;
                        updatePlaylistItem(song);
                        saveToLocalStorage();
                    };
                },
                onError: function(error) {
                    console.error("Metadata error:", error);
                    const audio = new Audio();
                    audio.src = song.url;
                    audio.onloadedmetadata = () => {
                        song.duration = audio.duration;
                        song.metaLoaded = true;
                        updatePlaylistItem(song);
                        saveToLocalStorage();
                    };
                }
            });
    }

    function updatePlaylistItem(song) {
        const item = playlist.querySelector(`[data-song-id="${song.id}"]`);
        if (item) {
            item.querySelector('.song-title').textContent = song.title;
            item.querySelector('.song-artist').textContent = song.artist;
            item.querySelector('.song-duration').textContent = formatTime(song.duration);

            const favoriteBtn = item.querySelector('.favorite-btn');
            if (favoriteBtn) {
                favoriteBtn.innerHTML = `<i class="${song.favorite ? 'fas' : 'far'} fa-star"></i>`;
                favoriteBtn.title = song.favorite ? "Remove from favorites" : "Add to favorites";
            }
        }
    }

    async function playSong(index) {
        if (index < 0 || index >= playlistSongs.length) return;

        currentSongIndex = index;
        const song = playlistSongs[index];

        document.querySelectorAll('.playlist-item').forEach(item => {
            item.classList.remove('active');
        });

        const activeItem = playlist.querySelector(`[data-song-id="${song.id}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }

        audioPlayer.src = song.url;
        audioPlayer.load();

        try {
            await audioPlayer.play();
        } catch (error) {
            console.error("Playback error:", error);
            try {
                const file = await getAudioFromDB(song.id);
                const newUrl = URL.createObjectURL(file);
                song.url = newUrl;
                audioPlayer.src = newUrl;
                await audioPlayer.play();
            } catch (dbError) {
                console.error("Error reloading audio:", dbError);
            }
        }

        document.querySelector('.track-title').textContent = song.title;
        document.querySelector('.track-artist').textContent = song.artist;
        document.querySelector('.mini-track-info .title').textContent = song.title;
        document.querySelector('.mini-track-info .artist').textContent = song.artist;
        totalTimeEl.textContent = formatTime(song.duration);

        const albumArt = document.querySelector('.album-art');
        const miniAlbumArt = document.querySelector('.mini-album-art');

        if (song.cover) {
            albumArt.style.backgroundImage = `url(${song.cover})`;
            albumArt.innerHTML = '<div class="album-art-overlay"><button class="player-btn" title="Add to favorites" id="add-to-favorites"><i class="fas fa-star"></i></button></div>';
            miniAlbumArt.style.backgroundImage = `url(${song.cover})`;
            miniAlbumArt.innerHTML = '';
        } else {
            albumArt.style.backgroundImage = '';
            albumArt.innerHTML = '<i class="fas fa-music"></i><div class="album-art-overlay"><button class="player-btn" title="Add to favorites" id="add-to-favorites"><i class="fas fa-star"></i></button></div>';
            miniAlbumArt.style.backgroundImage = '';
            miniAlbumArt.innerHTML = '<i class="fas fa-music"></i>';
        }

        isPlaying = true;
        playIcon.className = 'fas fa-pause';
        footerPlayIcon.className = 'fas fa-pause';
        albumArt.classList.add('pulse');

        addToFavoritesBtn.innerHTML = song.favorite ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
        addToFavoritesBtn.title = song.favorite ? "Remove from favorites" : "Add to favorites";
    }

    function togglePlay() {
        if (playlistSongs.length === 0) return;

        if (currentSongIndex === -1) {
            playSong(0);
            return;
        }

        if (isPlaying) {
            audioPlayer.pause();
            playIcon.className = 'fas fa-play';
            footerPlayIcon.className = 'fas fa-play';
            document.querySelector('.album-art').classList.remove('pulse');
        } else {
            audioPlayer.play();
            playIcon.className = 'fas fa-pause';
            footerPlayIcon.className = 'fas fa-pause';
            document.querySelector('.album-art').classList.add('pulse');
        }
        isPlaying = !isPlaying;
    }

    function prevSong() {
        if (playlistSongs.length === 0) return;

        let newIndex = currentSongIndex - 1;
        if (newIndex < 0) {
            newIndex = playlistSongs.length - 1;
        }
        playSong(newIndex);
    }

    function nextSong() {
        if (playlistSongs.length === 0) return;

        let newIndex = currentSongIndex + 1;
        if (newIndex >= playlistSongs.length) {
            newIndex = 0;
        }
        playSong(newIndex);
    }

    async function clearPlaylist() {
        if (confirm('Are you sure you want to clear the entire playlist?')) {
            playlistSongs.forEach(song => {
                if (song.url) {
                    URL.revokeObjectURL(song.url);
                }
            });

            const deletePromises = playlistSongs.map(song =>
                deleteAudioFromDB(song.id).catch(e => console.error(e))
            );
            await Promise.all(deletePromises);

            playlistSongs = [];
            currentSongIndex = -1;
            playlist.innerHTML = '<li class="empty-state"><i class="fas fa-music"></i><p>No songs in playlist</p><p>Upload music to get started</p></li>';

            audioPlayer.pause();
            audioPlayer.src = '';
            isPlaying = false;
            playIcon.className = 'fas fa-play';
            footerPlayIcon.className = 'fas fa-play';
            document.querySelector('.album-art').classList.remove('pulse');

            document.querySelector('.track-title').textContent = 'Unknown title';
            document.querySelector('.track-artist').textContent = 'Unknown artist';
            document.querySelector('.mini-track-info .title').textContent = 'Unknown title';
            document.querySelector('.mini-track-info .artist').textContent = 'Unknown artist';
            totalTimeEl.textContent = '0:00';
            currentTimeEl.textContent = '0:00';
            progressBar.style.width = '0%';

            localStorage.removeItem(METADATA_KEY);
            localStorage.removeItem('sonicbloom_folders');
        }
    }

    function shufflePlaylist() {
        if (playlistSongs.length === 0) return;

        for (let i = playlistSongs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [playlistSongs[i], playlistSongs[j]] = [playlistSongs[j], playlistSongs[i]];
        }

        renderPlaylist();

        if (currentSongIndex !== -1) {
            const currentSongId = playlistSongs[currentSongIndex].id;
            const item = playlist.querySelector(`[data-song-id="${currentSongId}"]`);
            if (item) {
                item.classList.add('active');
            }
        }
    }

    function formatTime(seconds) {
        if (isNaN(seconds) || seconds === 0) return "0:00";
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    }

    function saveToLocalStorage() {
        const playlistData = playlistSongs.map(song => {
            return {
                id: song.id,
                title: song.title,
                artist: song.artist,
                duration: song.duration,
                favorite: song.favorite,
                folder: song.folder,
                cover: song.cover
            };
        });
        localStorage.setItem(METADATA_KEY, JSON.stringify(playlistData));
        localStorage.setItem('sonicbloom_folders', JSON.stringify(folders));
    }

    async function loadFromLocalStorage() {
        const savedPlaylist = localStorage.getItem(METADATA_KEY);
        if (savedPlaylist) {
            try {
                const playlistData = JSON.parse(savedPlaylist);

                for (const songMeta of playlistData) {
                    try {
                        const file = await getAudioFromDB(songMeta.id);
                        const url = URL.createObjectURL(file);

                        const song = {
                            ...songMeta,
                            url: url,
                            metaLoaded: true
                        };

                        playlistSongs.push(song);
                    } catch (error) {
                        console.error(`Error loading audio ${songMeta.id}:`, error);
                    }
                }

                renderPlaylist();
            } catch (e) {
                console.error("Playlist load error:", e);
            }
        }

        const savedFolders = localStorage.getItem('sonicbloom_folders');
        if (savedFolders) {
            try {
                folders = JSON.parse(savedFolders);
                updateFolders();
            } catch (e) {
                console.error("Folders load error:", e);
            }
        }
    }

    function updateFolders() {
        foldersList.innerHTML = '';

        folders.forEach(folder => {
            const li = document.createElement('li');
            li.className = 'folder-item';
            if (folder.id === currentFolder) {
                li.classList.add('active');
            }
            li.dataset.folder = folder.id;

            li.innerHTML = `
                <i class="fas ${folder.icon} folder-icon"></i>
                ${folder.name}
                <div class="folder-actions">
                    <button class="folder-btn" title="Open folder">
                        <i class="fas fa-folder-open"></i>
                    </button>
                </div>
            `;

            li.addEventListener('click', (e) => {
                if (!e.target.closest('.folder-actions')) {
                    document.querySelectorAll('.folder-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    li.classList.add('active');
                    currentFolder = folder.id;
                    renderPlaylist();
                }
            });

            const openBtn = li.querySelector('.folder-btn');
            openBtn.addEventListener('click', () => {
                document.querySelectorAll('.folder-item').forEach(item => {
                    item.classList.remove('active');
                });
                li.classList.add('active');
                currentFolder = folder.id;
                renderPlaylist();
            });

            foldersList.appendChild(li);
        });
    }

    function renderPlaylist() {
        playlist.innerHTML = '';

        if (playlistSongs.length === 0) {
            if (!arePreferencesAllowed()) {
                showStorageDisabledMessage();
            } else {
                playlist.innerHTML = '<li class="empty-state"><i class="fas fa-music"></i><p>No songs in playlist</p><p>Upload music to get started</p></li>';
            }
            return;
        }

        let filteredSongs = playlistSongs;
        if (currentFolder === 'favorites') {
            filteredSongs = playlistSongs.filter(song => song.favorite);
        } else if (currentFolder !== 'all') {
            filteredSongs = playlistSongs.filter(song => song.folder === currentFolder);
        }

        if (filteredSongs.length === 0) {
            playlist.innerHTML = '<li class="empty-state"><i class="fas fa-folder-open"></i><p>No songs in this folder</p></li>';
            return;
        }

        filteredSongs.forEach(song => {
            const li = document.createElement('li');
            li.className = 'playlist-item';
            if (song.id === playlistSongs[currentSongIndex]?.id) {
                li.classList.add('active');
            }
            li.dataset.songId = song.id;

            li.innerHTML = `
                <i class="fas fa-music song-icon"></i>
                <div class="song-info">
                    <div class="song-title">${song.title}</div>
                    <div class="song-artist">${song.artist}</div>
                </div>
                <div class="song-duration">${formatTime(song.duration)}</div>
                <div class="song-actions">
                    <button class="song-action-btn favorite-btn" title="${song.favorite ? 'Remove from favorites' : 'Add to favorites'}">
                        <i class="${song.favorite ? 'fas' : 'far'} fa-star"></i>
                    </button>
                </div>
            `;

            li.addEventListener('click', (e) => {
                if (!e.target.closest('.song-actions')) {
                    const songId = li.dataset.songId;
                    const index = playlistSongs.findIndex(s => s.id === songId);
                    if (index !== -1) {
                        playSong(index);
                    }
                }
            });

            const favoriteBtn = li.querySelector('.favorite-btn');
            favoriteBtn.addEventListener('click', () => {
                const songId = li.dataset.songId;
                const song = playlistSongs.find(s => s.id === songId);
                if (song) {
                    song.favorite = !song.favorite;
                    favoriteBtn.innerHTML = `<i class="${song.favorite ? 'fas' : 'far'} fa-star"></i>`;
                    favoriteBtn.title = song.favorite ? "Remove from favorites" : "Add to favorites";
                    updateFolders();
                    saveToLocalStorage();
                }
            });

            playlist.appendChild(li);
        });
    }

    playBtn.addEventListener('click', togglePlay);
    footerPlayBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', prevSong);
    nextBtn.addEventListener('click', nextSong);
    footerPrevBtn.addEventListener('click', prevSong);
    footerNextBtn.addEventListener('click', nextSong);
    clearBtn.addEventListener('click', clearPlaylist);
    shuffleBtn.addEventListener('click', shufflePlaylist);

    volumeSlider.addEventListener('input', () => {
        audioPlayer.volume = volumeSlider.value;
    });

    audioPlayer.addEventListener('timeupdate', () => {
        if (audioPlayer.duration && !isNaN(audioPlayer.duration)) {
            const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            progressBar.style.width = `${progress}%`;
            currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
        }
    });

    audioPlayer.addEventListener('ended', nextSong);

    document.querySelector('.progress-bar').addEventListener('click', (e) => {
        const bar = e.currentTarget;
        const clickPosition = e.clientX - bar.getBoundingClientRect().left;
        const percentage = clickPosition / bar.clientWidth;
        audioPlayer.currentTime = percentage * audioPlayer.duration;
    });

    addFolderBtn.addEventListener('click', () => {
        folderModal.classList.add('active');
        folderNameInput.value = '';
        folderIconSelect.value = 'fa-music';
    });

    closeModalBtn.addEventListener('click', () => {
        folderModal.classList.remove('active');
    });

    cancelFolderBtn.addEventListener('click', () => {
        folderModal.classList.remove('active');
    });

    createFolderBtn.addEventListener('click', () => {
        const folderName = folderNameInput.value.trim();
        const folderIcon = folderIconSelect.value;

        if (folderName) {
            const folderId = 'folder-' + Date.now();
            folders.push({
                id: folderId,
                name: folderName,
                icon: folderIcon
            });

            updateFolders();
            saveToLocalStorage();
            folderModal.classList.remove('active');
        } else {
            alert('Please enter a folder name.');
        }
    });

    addToFavoritesBtn.addEventListener('click', () => {
        if (currentSongIndex !== -1) {
            const song = playlistSongs[currentSongIndex];
            song.favorite = !song.favorite;

            addToFavoritesBtn.innerHTML = song.favorite ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
            addToFavoritesBtn.title = song.favorite ? "Remove from favorites" : "Add to favorites";

            const songItem = playlist.querySelector(`[data-song-id="${song.id}"]`);
            if (songItem) {
                const favoriteBtn = songItem.querySelector('.favorite-btn');
                if (favoriteBtn) {
                    favoriteBtn.innerHTML = `<i class="${song.favorite ? 'fas' : 'far'} fa-star"></i>`;
                    favoriteBtn.title = song.favorite ? "Remove from favorites" : "Add to favorites";
                }
            }

            updateFolders();
            saveToLocalStorage();
        }
    });

    audioPlayer.volume = volumeSlider.value;

    if (arePreferencesAllowed()) {
        loadFromLocalStorage();
    } else {
        showStorageDisabledMessage();
    }

    updateFolders();
    renderPlaylist();
});

document.getElementById("save-settings").addEventListener("click", function() {
    location.reload();
});

document.addEventListener("DOMContentLoaded", async function() {
    const switcher = document.getElementById('scrollBarSwitcherAside');
    const html = document.documentElement;
    const body = document.body;
    
    const scrollState = localStorage.getItem('scrollbarState');
    const isHidden = scrollState === null || scrollState === 'hidden';
    
    if (isHidden) {
        html.classList.add('scrollbar-hidden');
        body.classList.add('scrollbar-hidden');
        switcher.textContent = 'Show ScrollBar';
    } else {
        html.classList.remove('scrollbar-hidden');
        body.classList.remove('scrollbar-hidden');
        switcher.textContent = 'Hide ScrollBar';
    }

    switcher.addEventListener('click', () => {
        const isNowHidden = !html.classList.contains('scrollbar-hidden');
        
        html.classList.toggle('scrollbar-hidden');
        body.classList.toggle('scrollbar-hidden');
        
        switcher.textContent = isNowHidden ? 'Show ScrollBar' : 'Hide ScrollBar';
        
        localStorage.setItem('scrollbarState', isNowHidden ? 'hidden' : 'visible');
    });
});

document.getElementById("settingsPannelOpenerAside").addEventListener("click", function() {
    document.getElementById("settings-panel").style.display = "block";
	document.getElementById("overlay").style.display = "block";
});