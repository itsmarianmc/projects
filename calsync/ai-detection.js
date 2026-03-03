const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

function getGeminiApiKey() {
	return localStorage.getItem('calsync_ai_api_key') || '';
}

function fileToBase64(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const base64 = reader.result.split(',')[1];
			resolve(base64);
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

function showProcessingOverlay(show) {
	const methodSelection = document.getElementById('methodSelection');
	const aiProcessing = document.getElementById('aiProcessing');
	
	if (show) {
		methodSelection.style.display = 'none';
		aiProcessing.style.display = 'block';
	} else {
		methodSelection.style.display = 'block';
		aiProcessing.style.display = 'none';
	}
}

function startAIDetection() {
	if (!currentCategory) return;
	
	if (typeof window.isAIReady !== 'function' || !window.isAIReady()) {
		showToast('❌ AI Detection not configured');
		return;
	}
	
	const fileInput = document.getElementById('aiImageInput');
	fileInput.click();
}

async function handleImageSelection(event) {
	const file = event.target.files[0];
	if (!file) return;
	
	if (!file.type.startsWith('image/')) {
		showToast('❌ Please select an image file');
		return;
	}
	
	const apiKey = getGeminiApiKey();
	if (!apiKey) {
		showToast('❌ No API key configured');
		return;
	}
	
	showProcessingOverlay(true);
	
	try {
		const base64Image = await fileToBase64(file);
		const nutritionData = await analyzeWithGemini(base64Image, apiKey);
		
		if (nutritionData) {
			populateNutritionData(nutritionData);
			showToast('✨ AI detected nutrition info!');
			goToStep(4);
		} else {
			throw new Error('No nutrition data detected');
		}
	} catch (error) {
		console.error('AI Analysis error:', error);
		
		if (error.message.includes('API key')) {
			showToast('❌ Invalid API key. Check Settings.');
		} else if (error.message.includes('quota')) {
			showToast('❌ API quota exceeded. Try again later.');
		} else {
			showToast('❌ AI analysis failed. Try again or enter manually.');
		}
	} finally {
		showProcessingOverlay(false);
		event.target.value = '';
	}
}

function populateNutritionData(nutritionData) {
	selFood = {
		name: nutritionData.name || currentCategory.category,
		brand: nutritionData.brand || '',
		kcalTotal: nutritionData.calories || 0,
		protTotal: nutritionData.protein || 0,
		carbTotal: nutritionData.carbs || 0,
		fatTotal: nutritionData.fat || 0,
		amount: nutritionData.amount || 100,
		unit: nutritionData.unit || 'g',
		emoji: currentCategory.emoji,
		color: currentCategory.color,
		isAI: true,
		isManual: false,
		isBarcode: false
	};

	el('foodPreviewName').textContent = selFood.name;
	el('foodPreviewBrand').textContent = selFood.brand || 'AI Detection';
	el('foodPreviewPer').textContent = `Estimated portion: ${selFood.amount}${selFood.unit}`;
	el('foodPreviewEmoji').innerHTML = `<i class="${selFood.emoji}" style="color:${selFood.color}"></i>`;

	selectedUnit = selFood.unit;
	el('amountInput').value = selFood.amount;

	el('aiServingSize').textContent = `${selFood.amount} ${selFood.unit}`;
	el('aiKcalTotal').textContent = `${selFood.kcalTotal} kcal`;
	el('aiProteinTotal').textContent = `${selFood.protTotal} g`;
	el('aiCarbsTotal').textContent = `${selFood.carbTotal} g`;
	el('aiFatTotal').textContent = `${selFood.fatTotal} g`;

	setAIMode(true);
	prevStepBeforeAmount = 2;
}

async function analyzeWithGemini(base64Image, apiKey) {
	const prompt = `Analyze this food image. Estimate the portion size and provide nutritional information for that specific portion.
Return a JSON object with the following fields:
- "name": the exact name of the food item (string)
- "brand": brand name if visible, otherwise empty string (string)
- "amount": estimated portion size in grams or milliliters (number)
- "unit": the unit of the portion, either "g" or "ml" (string)
- "calories": total calories for this portion (number)
- "protein": total protein in grams for this portion (number)
- "carbs": total carbohydrates in grams for this portion (number)
- "fat": total fat in grams for this portion (number)

If you cannot determine the exact values, use reasonable estimates based on similar foods.
Only respond with the JSON object, no additional text.`;

	const requestBody = {
		contents: [{
			parts: [
				{ text: prompt },
				{ inline_data: { mime_type: 'image/jpeg', data: base64Image } }
			]
		}],
		generationConfig: { 
			temperature: 0.4, 
			topK: 32, 
			topP: 1, 
			maxOutputTokens: 2048
		}
	};

	const response = await fetch(GEMINI_API_URL + '?key=' + apiKey, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(requestBody)
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		console.error('Gemini API error:', errorData);
		
		if (response.status === 400) {
			throw new Error('Invalid API key or request format');
		} else if (response.status === 429) {
			throw new Error('API quota exceeded');
		} else {
			throw new Error('Gemini API error: ' + response.status);
		}
	}

	const data = await response.json();
	
	if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) {
		const text = data.candidates[0].content.parts[0].text;
		try {
			const match = text.match(/\{[\s\S]*\}/);
			if (!match) throw new Error('No JSON object found in response');
			let jsonText = match[0];
			jsonText = jsonText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
			return JSON.parse(jsonText);
		} catch (parseError) {
			console.error('JSON parse error:', parseError);
			console.log('Response text:', text);
			throw new Error('Failed to parse AI response');
		}
	}
	
	throw new Error('Invalid AI response');
}

document.addEventListener('DOMContentLoaded', function() {
	const methodAI = document.getElementById('methodAI');
	const aiImageInput = document.getElementById('aiImageInput');
	
	if (methodAI) {
		methodAI.addEventListener('click', startAIDetection);
	}
	
	if (aiImageInput) {
		aiImageInput.addEventListener('change', handleImageSelection);
	}
});