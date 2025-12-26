function showAnimation(title, artists) {
	const musicContainer = document.getElementById('musicContainer');
	const precursorVertical = document.getElementById('precursorVertical');
	const leftBox = document.getElementById('leftBox');
	const arrow = document.getElementById('arrow');
	const precursorHorizontal = document.getElementById('precursorHorizontal');
	const bar = document.getElementById('bar');
	const text = document.getElementById('text');
	const titleText = document.getElementById('titleText');
	const subtitleText = document.getElementById('subtitleText');

	titleText.textContent = title;
	subtitleText.textContent = artists;

	precursorVertical.classList.remove('animate');
	leftBox.classList.remove('animate');
	arrow.classList.remove('animate');
	precursorHorizontal.classList.remove('animate');
	bar.classList.remove('animate');
	text.classList.remove('animate');

	musicContainer.classList.add('show');

	setTimeout(() => {
		precursorVertical.classList.add('animate');
		leftBox.classList.add('animate');
		arrow.classList.add('animate');
		precursorHorizontal.classList.add('animate');
		bar.classList.add('animate');
		text.classList.add('animate');
	}, 50);

	setTimeout(() => {
		musicContainer.classList.remove('show');
	}, 13000);
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
		const title = data.item.name;
		const artists = data.item.artists.map(a => a.name).join(", ").replace(/, ([^,]*)$/, " FT. $1");

		if (songId !== currentSongId) {
			currentSongId = songId;
			firstAnimationShown = false;
			secondAnimationShown = false;
			thirdAnimationShown = false;
		}

		if (progress >= 10000 && progress <= 12000 && !firstAnimationShown) {
			showAnimation(title, artists);
			firstAnimationShown = true;
		}

		const midpoint = duration / 2;
		if (progress >= midpoint - 5000 && progress <= midpoint + 5000 && !thirdAnimationShown) {
			showAnimation(title, artists);
			thirdAnimationShown = true;
		}

		const timeRemaining = duration - progress;
		if (timeRemaining <= 23000 && timeRemaining >= 21000 && !secondAnimationShown) {
			showAnimation(title, artists);
			secondAnimationShown = true;
		}
	}, 2000);
}