function showAnimation(title, artists, coverUrl) {
	const musicContainer = document.getElementById('musicContainer');
	const leftBox = document.querySelector('.left-box');
	const leftBoxDiv = document.querySelector('.left-box div');
	const leftBoxSvg = document.querySelector('.left-box svg');
	const mainContainer = document.querySelector('.main-content');
	const titles = document.querySelector('.titles');

	const titleText = document.getElementById('title');
	const subtitleText = document.getElementById('subtitle');

	coverImg.src = coverUrl;

	titleText.textContent = title;
	subtitleText.textContent = artists;

	leftBox.classList.remove('animate');
	leftBoxDiv.classList.remove('animate');
	leftBoxSvg.classList.remove('animate');
	mainContainer.classList.remove('animate');
	titles.classList.remove('animate');
	musicContainer.classList.add('show');

	setTimeout(() => {
		leftBox.classList.add('animate');
		leftBoxDiv.classList.add('animate');
		leftBoxSvg.classList.add('animate');
		mainContainer.classList.add('animate');
		titles.classList.add('animate');
	}, 50);

	setTimeout(() => {
		musicContainer.classList.remove('show');
	}, 17000);
}

async function monitorPlayback(token) {
	setInterval(async () => {
		const data = await fetchCurrentSong(token);

		if (!data || !data.item || !data.is_playing) {
			currentSongId = null;
			firstAnimationShown = false;
			secondAnimationShown = false;
			return;
		}

		const songId = data.item.id;
		const progress = data.progress_ms;
		const duration = data.item.duration_ms;
		const title = data.item.name.replace(/\s*\((?:with|feat\.?|ft\.?)\s+[^)]+\)|\s*\([^)]*(?:feat\.?|ft\.?)[^)]*\)/gi, '');
		const coverUrl = data.item.album.images[0]?.url || "";
		const artists = data.item.artists.map(a => a.name).join(", ").replace(/, ([^,]*)$/, " FT. $1");

		if (songId !== currentSongId) {
			currentSongId = songId;
			firstAnimationShown = false;
			secondAnimationShown = false;
			thirdAnimationShown = false;
		}

		if (progress >= 10000 && progress <= 12000 && !firstAnimationShown) {
			showAnimation(title, artists, coverUrl);
			firstAnimationShown = true;
		}

		const midpoint = duration / 2;
		if (progress >= midpoint - 5000 && progress <= midpoint + 5000 && !thirdAnimationShown) {
			showAnimation(title, artists, coverUrl);
			thirdAnimationShown = true;
		}

		const timeRemaining = duration - progress;
		if (timeRemaining <= 23000 && timeRemaining >= 21000 && !secondAnimationShown) {
			showAnimation(title, artists, coverUrl);
			secondAnimationShown = true;
		}
	}, 2000);
}