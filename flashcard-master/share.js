function encodeSetForSharing(set) {
    try {
        const cleanSet = {
            name: set.name,
            description: set.description || '',
            category: set.category || '',
            color: set.color || '#4361ee',
            cards: set.cards.map(card => ({
                question: card.question,
                answer: card.answer,
                hint: card.hint || ''
            }))
        };
        
        const jsonString = JSON.stringify(cleanSet);
        return btoa(unescape(encodeURIComponent(jsonString)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    } catch (error) {
        console.error('Error encoding set for sharing:', error);
        return null;
    }
}

function decodeSharedSet(encodedData) {
    try {
        let base64 = encodedData
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        
        while (base64.length % 4) {
            base64 += '=';
        }
        
        const jsonString = decodeURIComponent(escape(atob(base64)));
        const set = JSON.parse(jsonString);
        
        if (!set.name || !Array.isArray(set.cards)) {
            throw new Error('Invalid set structure');
        }
        
        return set;
    } catch (error) {
        console.error('Error decoding shared set:', error);
        return null;
    }
}

function generateShareUrl(setId) {
    const set = sets.find(s => s.id === setId);
    if (!set) {
        console.error('Set not found for sharing');
        return null;
    }
    
    const encodedData = encodeSetForSharing(set);
    if (!encodedData) {
        return null;
    }
    
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?share=${encodedData}`;
}

async function shareSet(setId) {
    const shareUrl = generateShareUrl(setId);
    if (!shareUrl) {
        showNotification('Fehler beim Erstellen des Teilen-Links', 'error');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(shareUrl);
        showNotification('Link wurde in die Zwischenablage kopiert!', 'success');
    } catch (error) {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            showNotification('Link wurde in die Zwischenablage kopiert!', 'success');
        } catch (fallbackError) {
            prompt('Kopiere diesen Link zum Teilen:', shareUrl);
        }
        
        document.body.removeChild(textArea);
    }
}

function showNotification(message, type = 'info') {
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="#718096">
        <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
        </svg></button>
    `;
    
    document.body.appendChild(notification);
    
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    });
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 50000);
}

function checkForSharedSet() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get('share');
    
    if (sharedData) {
        const decodedSet = decodeSharedSet(sharedData);
        
        if (decodedSet) {
            showImportDialog(decodedSet);
        } else {
            showNotification('Ungültiger Teilen-Link', 'error');
        }
        
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
}

function showImportDialog(sharedSet) {
    const dialog = document.createElement('div');
    dialog.className = 'import-dialog-overlay';
    dialog.innerHTML = `
        <div class="import-dialog">
            <div class="import-dialog-header">
                <h3><i class="fas fa-share-alt"></i> Geteiltes Set importieren</h3>
            </div>
            <div class="import-dialog-content">
                <div class="shared-set-preview">
                    <h4>${sharedSet.name}</h4>
                    ${sharedSet.description ? `<p class="description">${sharedSet.description}</p>` : ''}
                    ${sharedSet.category ? `<p class="category"><i class="fas fa-tag"></i> ${sharedSet.category}</p>` : ''}
                    <p class="card-count"><i class="fas fa-copy"></i> ${sharedSet.cards.length} Karten</p>
                </div>
                <p>Möchtest du dieses geteilte Flashcard-Set zu deiner Sammlung hinzufügen?</p>
            </div>
            <div class="import-dialog-actions">
                <button class="cancel-btn">
                    <i class="fas fa-times"></i> Abbrechen
                </button>
                <button class="import-btn success">
                    <i class="fas fa-plus"></i> Importieren
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    const cancelBtn = dialog.querySelector('.cancel-btn');
    const importBtn = dialog.querySelector('.import-btn');
    
    cancelBtn.addEventListener('click', () => {
        dialog.remove();
    });
    
    importBtn.addEventListener('click', () => {
        importSharedSet(sharedSet);
        dialog.remove();
    });
    
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
        }
    });
}

function importSharedSet(sharedSet) {
    const newSet = {
        id: Date.now().toString(),
        name: sharedSet.name,
        description: sharedSet.description || '',
        category: sharedSet.category || '',
        color: sharedSet.color || '#4361ee',
        cards: sharedSet.cards.map(card => ({
            id: Date.now().toString() + Math.floor(Math.random() * 1000),
            question: card.question,
            answer: card.answer,
            hint: card.hint || ''
        }))
    };
    
    sets.push(newSet);
    saveSets();
    renderSets();
    
    showNotification(`Set "${sharedSet.name}" erfolgreich importiert!`, 'success');
}

document.addEventListener('DOMContentLoaded', function() {
    const shareButton = document.getElementById('share-set-btn');
    if (shareButton) {
        shareButton.addEventListener('click', () => {
            if (currentSetId) {
                shareSet(currentSetId);
            }
        });
    }
    
    checkForSharedSet();
});

window.shareFlashcardSet = shareSet;
window.checkForSharedFlashcardSet = checkForSharedSet;