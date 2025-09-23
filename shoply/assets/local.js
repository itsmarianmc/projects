document.addEventListener('DOMContentLoaded', function() {
	const localAddItemBtn = document.getElementById('localAddItemBtn');
	const localAddCategoryBtn = document.getElementById('localAddCategoryBtn');
	const localItemNameInput = document.getElementById('localItemName');
	const localItemCategorySelect = document.getElementById('localItemCategory');
	const localItemQuantityInput = document.getElementById('localItemQuantity');
	const localNewCategoryNameInput = document.getElementById('localNewCategoryName');
	const localCategoryList = document.getElementById('localCategoryList');
	const localExportBtn = document.getElementById('localExportBtn');
	const localClearBtn = document.getElementById('localClearBtn');
	const localDataFileInput = document.getElementById('localDataFile');
	const localUpdateTime = document.getElementById('localUpdateTime');

	let localCategories = [];
	let localItems = [];

	function initLocalList() {
		loadLocalData();
		updateLocalCategoryDropdown();
		renderLocalItems();

		localAddItemBtn.addEventListener('click', addLocalItem);
		localAddCategoryBtn.addEventListener('click', addLocalCategory);
		localExportBtn.addEventListener('click', exportLocalData);
		localClearBtn.addEventListener('click', clearLocalData);
		localDataFileInput.addEventListener('change', importLocalData);

		localCategoryList.addEventListener('click', (e) => {
			const clickedElement = e.target;
			const checkBtn = clickedElement.closest('.btn-check');
			const deleteBtn = clickedElement.closest('.btn-delete');
			const deleteCategoryBtn = clickedElement.closest('.btn-delete-category');

			if (checkBtn) {
				e.preventDefault();
				e.stopPropagation();
				const itemElement = checkBtn.closest('.item');
				const itemId = itemElement.dataset.id;
				const isDone = itemElement.classList.contains('done');
				toggleLocalItemDone(itemId, !isDone);
			} else if (deleteBtn) {
				e.preventDefault();
				e.stopPropagation();
				const itemElement = deleteBtn.closest('.item');
				const itemId = itemElement.dataset.id;
				if (confirm('Do you really want to delete this item?')) {
					deleteLocalItem(itemId);
				}
			} else if (deleteCategoryBtn) {
				e.preventDefault();
				e.stopPropagation();
				const categoryCard = deleteCategoryBtn.closest('.category-card');
				const categoryId = categoryCard.dataset.categoryId;
				const categoryName = categoryCard.querySelector('h4').textContent;
				if (confirm(`Do you really want to delete the category "${categoryName}"? All items in this category will also be deleted.`)) {
					deleteLocalCategory(categoryId);
				}
			}
		});
	}

	function loadLocalData() {
		const savedCategories = localStorage.getItem('localCategories');
		const savedItems = localStorage.getItem('localItems');

		if (savedCategories) {
			localCategories = JSON.parse(savedCategories);
		} else {
			localCategories = [];
			saveLocalCategories();
		}

		if (savedItems) {
			localItems = JSON.parse(savedItems);
		} else {
			localItems = [];
			saveLocalItems();
		}

		updateLocalTime();
	}

	function saveLocalCategories() {
		localStorage.setItem('localCategories', JSON.stringify(localCategories));
		updateLocalTime();
	}

	function saveLocalItems() {
		localStorage.setItem('localItems', JSON.stringify(localItems));
		updateLocalTime();
	}

	function updateLocalCategoryDropdown() {
		localItemCategorySelect.innerHTML = '<option value="">Select...</option>';

		localCategories.forEach(category => {
			const option = document.createElement('option');
			option.value = category.id;
			option.textContent = category.name;
			localItemCategorySelect.appendChild(option);
		});
	}

	function renderLocalItems() {
		const itemsByCategory = {};

		localCategories.forEach(category => {
			itemsByCategory[category.id] = {
				items: [],
				category: category
			};
		});

		itemsByCategory['uncategorized'] = {
			items: [],
			category: {
				id: 'uncategorized',
				name: 'Uncategorized'
			}
		};

		localItems.forEach(item => {
			const categoryId = item.categoryId || 'uncategorized';
			if (!itemsByCategory[categoryId]) {
				itemsByCategory[categoryId] = {
					items: [],
					category: {
						id: categoryId,
						name: 'Unknown Category'
					}
				};
			}
			itemsByCategory[categoryId].items.push(item);
		});

		localCategoryList.innerHTML = '';

		let hasAnyCategories = false;

		for (const categoryId in itemsByCategory) {
			if (categoryId === 'uncategorized') continue;
			const categoryData = itemsByCategory[categoryId];
			hasAnyCategories = true;
			addLocalCategoryWithItems(categoryData.category, categoryData.items);
		}

		if (!hasAnyCategories) {
			const emptyMessage = document.createElement('div');
			emptyMessage.id = 'emptyLocalCatList';
			emptyMessage.style.textAlign = 'center';
			emptyMessage.style.width = '100%';
			emptyMessage.innerHTML = `
        <p>No categories created yet</p>
        <p>Create a category first, then add items.</p>
      `;
			localCategoryList.appendChild(emptyMessage);
		}
	}

	function addLocalCategoryWithItems(category, items) {
		const categoryCard = document.createElement('div');
		categoryCard.className = 'category-card';
		categoryCard.dataset.categoryId = category.id;

		const categoryHeader = document.createElement('div');
		categoryHeader.className = 'category-header';

		const categoryTitle = document.createElement('h4');
		categoryTitle.textContent = category.name;

		if (category.id !== 'uncategorized') {
			const deleteCategoryBtn = document.createElement('button');
			deleteCategoryBtn.className = 'btn-delete-category';
			deleteCategoryBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="32" viewBox="0 -960 960 960" width="32" fill="#fff"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>';
			deleteCategoryBtn.title = 'Delete category';
			categoryHeader.appendChild(categoryTitle);
			categoryHeader.appendChild(deleteCategoryBtn);
		} else {
			categoryHeader.appendChild(categoryTitle);
		}

		categoryCard.appendChild(categoryHeader);

		const itemsList = document.createElement('ul');
		itemsList.className = 'items-list';

		items.forEach(item => {
			const listItem = createLocalItemElement(item);
			itemsList.appendChild(listItem);
		});

		if (items.length === 0) {
			const emptyMessage = document.createElement('li');
			emptyMessage.className = 'empty-category';
			emptyMessage.textContent = 'No items in this category';
			itemsList.appendChild(emptyMessage);
		}

		categoryCard.appendChild(itemsList);
		localCategoryList.appendChild(categoryCard);

		setTimeout(() => {
			categoryCard.classList.add('fadeIn');

			setTimeout(() => {
				categoryCard.classList.remove('fadeIn');
				categoryCard.classList.add('animated');
			}, 600);
		}, 50);
	}

	function createLocalItemElement(item) {
		const listItem = document.createElement('li');
		listItem.className = `item ${item.done ? 'done' : ''}`;
		listItem.dataset.id = item.id;

		const itemContent = document.createElement('div');
		itemContent.className = 'item-content';

		const itemText = document.createElement('span');
		itemText.className = 'item-text';
		itemText.textContent = item.quantity > 1 ? `${item.name} (${item.quantity}x)` : item.name;

		itemContent.appendChild(itemText);

		const itemActions = document.createElement('div');
		itemActions.className = 'item-actions';

		const checkBtn = document.createElement('button');
		checkBtn.className = 'btn-check';
		checkBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="32" viewBox="0 -960 960 960" width="32" fill="#fff"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>';

		const deleteBtn = document.createElement('button');
		deleteBtn.className = 'btn-delete';
		deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="32" viewBox="0 -960 960 960" width="32" fill="#fff"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>';

		itemActions.appendChild(checkBtn);
		itemActions.appendChild(deleteBtn);

		listItem.appendChild(itemContent);
		listItem.appendChild(itemActions);

		return listItem;
	}

	function addLocalItem() {
		const name = localItemNameInput.value.trim();
		const categoryId = localItemCategorySelect.value;
		const quantity = parseInt(localItemQuantityInput.value) || 1;

		if (!name) {
			showLocalStatusMessage('Please enter a name for the item.', 'error');
			return;
		}

		if (!categoryId) {
			showLocalStatusMessage('Please select a category.', 'error');
			return;
		}

		const newItem = {
			id: Date.now().toString(),
			name: name,
			categoryId: categoryId,
			quantity: quantity,
			done: false,
			createdAt: new Date().toISOString()
		};

		localItems.push(newItem);
		saveLocalItems();
		renderLocalItems();

		showLocalStatusMessage(`"${name}" was added to the local list.`, 'success');

		localItemNameInput.value = '';
		localItemQuantityInput.value = '1';
	}

	function addLocalCategory() {
		const name = localNewCategoryNameInput.value.trim();

		if (!name) {
			showLocalStatusMessage('Please enter a name for the category.', 'error');
			return;
		}

		const duplicateCategory = localCategories.find(cat =>
			cat.name.toLowerCase() === name.toLowerCase()
		);

		if (duplicateCategory) {
			showLocalStatusMessage('A category with this name already exists.', 'error');
			return;
		}

		const newCategory = {
			id: Date.now().toString(),
			name: name
		};

		localCategories.push(newCategory);
		saveLocalCategories();
		updateLocalCategoryDropdown();

		showLocalStatusMessage(`Category "${name}" was added.`, 'success');

		localNewCategoryNameInput.value = '';
	}

	function deleteLocalItem(itemId) {
		localItems = localItems.filter(item => item.id !== itemId);
		saveLocalItems();
		renderLocalItems();

		showLocalStatusMessage('Item was deleted.', 'success');
	}

	function deleteLocalCategory(categoryId) {
		localItems = localItems.filter(item => item.categoryId !== categoryId);

		localCategories = localCategories.filter(cat => cat.id !== categoryId);

		saveLocalCategories();
		saveLocalItems();
		updateLocalCategoryDropdown();
		renderLocalItems();

		showLocalStatusMessage('Category was deleted.', 'success');
	}

	function toggleLocalItemDone(itemId, done) {
		const item = localItems.find(item => item.id === itemId);
		if (item) {
			item.done = done;
			saveLocalItems();
			renderLocalItems();
		}
	}

	function exportLocalData() {
		const data = {
			categories: localCategories,
			items: localItems,
			exportedAt: new Date().toISOString(),
			version: '1.0'
		};

		const dataStr = JSON.stringify(data, null, 2);
		const dataBlob = new Blob([dataStr], {
			type: 'application/json'
		});

		const url = URL.createObjectURL(dataBlob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `shoply_local_data_${new Date().toISOString().split('T')[0]}.json`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);

		showLocalStatusMessage('Data was successfully exported.', 'success');
	}

	function importLocalData(event) {
		const file = event.target.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = function(e) {
			try {
				const data = JSON.parse(e.target.result);

				if (!data.categories || !data.items) {
					throw new Error('Invalid data format');
				}

				if (!confirm('Do you want to replace the existing data with the imported data?')) {
					localDataFileInput.value = '';
					return;
				}

				localCategories = data.categories;
				localItems = data.items;

				saveLocalCategories();
				saveLocalItems();
				updateLocalCategoryDropdown();
				renderLocalItems();

				showLocalStatusMessage('Data was successfully imported.', 'success');
			} catch (error) {
				console.error('Import error:', error);
				showLocalStatusMessage('Error importing data. Make sure the file is valid.', 'error');
			}

			localDataFileInput.value = '';
		};

		reader.readAsText(file);
	}

	function clearLocalData() {
		if (!confirm('Do you really want to delete all local data? This action cannot be undone.')) {
			return;
		}

		localCategories = [];
		localItems = [];

		saveLocalCategories();
		saveLocalItems();
		updateLocalCategoryDropdown();
		renderLocalItems();

		showLocalStatusMessage('All local data was deleted.', 'success');
	}

	function showLocalStatusMessage(message, type) {
		let statusElement = document.getElementById('localStatus');

		if (!statusElement) {
			statusElement = document.createElement('div');
			statusElement.id = 'localStatus';
			statusElement.className = 'status-message';
			document.querySelector('#local .app-screen').appendChild(statusElement);
		}

		statusElement.textContent = message;
		statusElement.className = `status-message ${type}`;
		statusElement.classList.remove('isHidden');
		statusElement.classList.remove('hidden');

		setTimeout(() => {
			statusElement.classList.add('isHidden');
			setTimeout(() => {
				statusElement.textContent = '';
				statusElement.classList.add('hidden');
			}, 900);
		}, 3000);
	}

	function updateLocalTime() {
		localUpdateTime.textContent = new Date().toLocaleTimeString();
	}

	initLocalList();
});