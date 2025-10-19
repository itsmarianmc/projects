document.getElementById('diceBtn').addEventListener('click', rollDice);

const dice = [
	'1',
	'2',
	'3',
	'4',
	'5',
	'6'
];

const rotations = [
    {
		x: 0,
		y: 0
	},
	{
		x: 0,
		y: 180
	},
	{
		x: 0,
		y: -90
	},
	{
		x: 0,
		y: 90
	},
	{
		x: -90,
		y: 0
	},
	{
		x: 90,
		y: 0
	}
];

function rollDice() {
    const container = document.querySelector('.container')
	const cube = document.getElementById('cube');
    const diceBtn = document.getElementById('diceBtn');
	const result = document.getElementById('result');

    const swoosh = new Audio(`swoosh.mp3`);
    swoosh.play();

	result.innerHTML = '';
    diceBtn.disabled = true;
    diceBtn.innerHTML = "Rolling...";

	const randomIndex = Math.floor(Math.random() * 6);
	const rotation = rotations[randomIndex];

	const finalX = rotation.x + (360 * randomIndex);
	const finalY = rotation.y + (360 * randomIndex);

    container.classList.add('rolling');
	cube.style.transform = `rotateX(${finalX}deg) rotateY(${finalY}deg)`;

	setTimeout(() => {
        container.classList.remove('rolling');
		result.innerHTML = `Result: ${dice[randomIndex]}`;
        setTimeout(() => {
            diceBtn.disabled = false;
            diceBtn.innerHTML = "Roll again &#127922;";

            // const success = new Audio(`success.mp3`);
            // success.play();
        }, 100);
	}, 1700);
}