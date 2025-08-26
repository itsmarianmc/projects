const form = document.getElementById('registerForm');
const submitBtn = document.getElementById('submitBtn');
const privacyCheck = document.getElementById('privacyCheck');
const displayName = document.getElementById('displayName');
const email = document.getElementById('email');
const note = document.getElementById('note');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notification-message');
const notificationDetails = document.getElementById('notification-details');

function validateForm() {
	const isNameValid = displayName.value.trim() !== '';
	const isEmailValid = validateEmail(email.value);
	const isPrivacyChecked = privacyCheck.checked;

	submitBtn.disabled = !(isNameValid && isEmailValid && isPrivacyChecked);

	return isNameValid && isEmailValid && isPrivacyChecked;
}

function validateEmail(email) {
	const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return re.test(String(email).toLowerCase());
}

displayName.addEventListener('blur', function() {
	const isValid = this.value.trim() !== '';
	document.getElementById('nameValidation').style.display = isValid ? 'none' : 'block';
	this.classList.toggle('invalid', !isValid);
	validateForm();
});

email.addEventListener('blur', function() {
	const isValid = validateEmail(this.value);
	document.getElementById('emailValidation').style.display = isValid ? 'none' : 'block';
	this.classList.toggle('invalid', !isValid);
	validateForm();
});

privacyCheck.addEventListener('change', validateForm);

form.addEventListener('submit', async function(e) {
	e.preventDefault();

	if (!validateForm()) {
		if (displayName.value.trim() === '') {
			document.getElementById('nameValidation').style.display = 'block';
			displayName.classList.add('invalid');
		}

		if (!validateEmail(email.value)) {
			document.getElementById('emailValidation').style.display = 'block';
			email.classList.add('invalid');
		}

		showNotification('Please fill in all required fields correctly.', 'Review your entries and accept the privacy policy.', true);
		return;
	}

	const formData = {
		displayName: displayName.value.trim(),
		email: email.value.trim(),
		note: note.value.trim() || 'No note specified'
	};

	try {
		submitBtn.classList.add('loading');
		submitBtn.textContent = '';

		const response = await fetch('https://itsmarianmc-github.vercel.app/api/shoply/register', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(formData)
		});

		const data = await response.json();

		if (response.ok) {
			showNotification('Registration successful!', 'Keep an eye on your email inbox; we will send you your user ID as soon as we have received confirmation.');
			form.reset();
			privacyCheck.checked = false;
			validateForm();
		} else {
			throw new Error(data.error || 'Server responded with an error');
		}
	} catch (error) {
		console.error('Error:', error);
		showNotification('Error while signing up:', error.message, true);
	} finally {
		submitBtn.classList.remove('loading');
		submitBtn.textContent = 'Sign up';
		validateForm();
	}
});

function showNotification(message, details = '', isError = false) {
	notificationMessage.textContent = message;
	notificationDetails.textContent = details;

	if (isError) {
		notification.classList.add('error');
	} else {
		notification.classList.remove('error');
	}

	notification.classList.add('show');

	setTimeout(() => {
		notification.classList.remove('show');
	}, 5000);
}

validateForm();