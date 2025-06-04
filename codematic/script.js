document.addEventListener('DOMContentLoaded', function() {
	const languageSelect = document.getElementById('language');
	const indentSelect = document.getElementById('indent');
	const beautifyBtn = document.getElementById('beautify-btn');
	const inputCode = document.getElementById('input-code');
	const outputCode = document.getElementById('output-code');
	const errorMessage = document.getElementById('error-message');
	const copyBtn = document.getElementById('copy-btn');
	const clearBtn = document.getElementById('clear-btn');
	const inputCount = document.getElementById('input-count');
	const outputCount = document.getElementById('output-count');

	inputCode.addEventListener('input', function() {
		const count = inputCode.value.length;
		inputCount.textContent = `${count} characters`;
	});

	beautifyBtn.addEventListener('click', function() {
		const code = inputCode.value;
		if (!code) {
			errorMessage.textContent = 'Please enter code to format it.';
			return;
		}

		const language = languageSelect.value;

		let indent_size = parseInt(indentSelect.value);
		let indent_char = ' ';
		if (indentSelect.value === 'tab') {
			indent_size = 1;
			indent_char = '\t';
		}

		const options = {
			indent_size: indent_size,
			indent_char: indent_char,
			max_preserve_newlines: 2,
			preserve_newlines: true,
			wrap_line_length: 0,
			end_with_newline: true
		};

		try {
			let beautified;
			switch (language) {
				case 'html':
					beautified = html_beautify(code, options);
					break;
				case 'css':
					beautified = css_beautify(code, options);
					break;
				case 'javascript':
					beautified = js_beautify(code, options);
					break;
				case 'json':
					try {
						const jsonObj = JSON.parse(code);
						beautified = JSON.stringify(jsonObj, null, indent_char.repeat(indent_size));
					} catch (e) {
						throw new Error('Invalid JSON: ' + e.message);
					}
					break;
			}

			outputCode.value = beautified;
			const outCount = beautified.length;
			outputCount.textContent = `${outCount} characters`;
			errorMessage.textContent = '';
		} catch (e) {
			errorMessage.textContent = 'Formatting error: ' + e.message;
			outputCode.value = '';
			outputCount.textContent = '0 characters';
		}
	});

	copyBtn.addEventListener('click', function() {
		if (!outputCode.value) return;

		outputCode.select();
		document.execCommand('copy');

		const originalText = copyBtn.textContent;
		copyBtn.textContent = 'Copied!';
		setTimeout(() => {
			copyBtn.textContent = originalText;
		}, 2000);
	});

	clearBtn.addEventListener('click', function() {
		inputCode.value = '';
		outputCode.value = '';
		errorMessage.textContent = '';
		inputCount.textContent = '0 characters';
		outputCount.textContent = '0 characters';
	});
});

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const root = document.documentElement;
    const body = document.body;

    function applyDarkMode(enabled) {
        if (enabled) {
            body.classList.add('dark-mode');
            root.classList.add('dark');
            root.classList.remove('light');
            themeToggle.classList.add('dark');
            themeToggle.classList.remove('light');
            localStorage.setItem('darkMode', 'enabled');
        } else {
            body.classList.remove('dark-mode');
            root.classList.remove('dark');
            root.classList.add('light');
            themeToggle.classList.remove('dark');
            themeToggle.classList.add('light');
            localStorage.setItem('darkMode', 'disabled');
        }
    }

    const darkPref = localStorage.getItem('darkMode');
    applyDarkMode(darkPref === 'enabled');
    
    themeToggle.addEventListener('click', () => {
        const isDark = localStorage.getItem('darkMode') === 'enabled';
        applyDarkMode(!isDark);
    });
});