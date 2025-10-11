const editor = document.getElementById('editor');
const themeToggle = document.getElementById('themeToggle');
let autoSaveTimer;

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
}

function setTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.classList.add('dark');
        document.getElementById('flexHeadImg').src = 'favicon.png'
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.classList.remove('dark');
        document.getElementById('flexHeadImg').src = 'favicon_dark.png'
    }
    localStorage.setItem('theme', theme);
}

function toggleTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

function loadNotes() {
    const saved = localStorage.getItem('notes');
    if (saved) {
        editor.innerHTML = saved;
        updateStats();
    }
}

function saveNotes() {
    localStorage.setItem('notes', editor.innerHTML);
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('saveStatus').textContent = `Saved at ${time}`;
    showNotification();
}

function showNotification() {
    const notif = document.getElementById('notification');
    notif.classList.add('show');
    setTimeout(() => notif.classList.remove('show'), 2000);
}

function resetAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        saveNotes();
    }, 2000);
}

function updateStats() {
    const text = editor.innerText;
    document.getElementById('charCount').textContent = text.length;

    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    document.getElementById('wordCount').textContent = words;

    const lines = text ? 
        text.split('\n')
            .filter(line => line.trim() !== '')
            .length : 0;
    document.getElementById('lineCount').textContent = lines;
}

function formatText(format) {
    document.execCommand(format, false, null);
    editor.focus();
    resetAutoSave();

    let btnId;
    switch (format) {
        case 'bold':
            btnId = 'boldBtn';
            break;
        case 'italic':
            btnId = 'italicBtn';
            break;
        case 'underline':
            btnId = 'underlineBtn';
            break;
        default:
            btnId = null;
    }
    if (btnId) {
        document.getElementById(btnId).classList.toggle('active', document.queryCommandState(format));
    }
}

function clearFormatting() {
    document.execCommand('removeFormat', false, null);
    editor.focus();
    resetAutoSave();
}

editor.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
            case 'b':
                e.preventDefault();
                formatText('bold');
                return;
            case 'i':
                e.preventDefault();
                formatText('italic');
                return;
            case 'u':
                e.preventDefault();
                formatText('underline');
                return;
            case 's':
                e.preventDefault();
                saveNotes();
                return;
        }
    }

    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const currentNode = range.startContainer;
    
    let currentLine = '';
    if (currentNode.nodeType === 3) {
        const textBeforeCursor = currentNode.textContent.substring(0, range.startOffset);
        const lastLineBreak = textBeforeCursor.lastIndexOf('\n');
        currentLine = lastLineBreak >= 0 ? textBeforeCursor.substring(lastLineBreak + 1) : textBeforeCursor;
    }

    if (e.key === 'Enter') {
        const bulletMatch = currentLine.match(/^(•\s)/);
        if (bulletMatch) {
            e.preventDefault();
            
            const textAfterBullet = currentLine.substring(2).trim();
            if (textAfterBullet === '') {
                const deleteCount = currentLine.length;
                for (let i = 0; i < deleteCount; i++) {
                    document.execCommand('delete', false, null);
                }
                document.execCommand('insertParagraph', false, null);
            } else {
                document.execCommand('insertParagraph', false, null);
                document.execCommand('insertText', false, '• ');
            }
            return;
        }

        const numberMatch = currentLine.match(/^(\d+)\.\s/);
        if (numberMatch) {
            e.preventDefault();
            const currentNum = parseInt(numberMatch[1]);
            
            const textAfterNumber = currentLine.substring(numberMatch[0].length).trim();
            
            if (textAfterNumber === '') {
                const deleteCount = currentLine.length;
                for (let i = 0; i < deleteCount; i++) {
                    document.execCommand('delete', false, null);
                }
                document.execCommand('insertParagraph', false, null);
            } else {
                const nextNum = currentNum + 1;
                document.execCommand('insertParagraph', false, null);
                document.execCommand('insertText', false, `${nextNum}. `);
            }
            return;
        }
    }

    if (e.key === 'Backspace') {
        const bulletMatch = currentLine.match(/^(•\s)/);
        if (bulletMatch) {
            e.preventDefault();
            
            const textAfterBullet = currentLine.substring(2).trim();
            if (textAfterBullet === '') {
                const deleteCount = currentLine.length;
                for (let i = 0; i < deleteCount; i++) {
                    document.execCommand('delete', false, null);
                }
                document.execCommand('insertParagraph', false, null);
            } else {
                document.execCommand('insertParagraph', false, null);
                document.execCommand('insertText', false, '• ');
            }
            return;
        }
        const numberMatch = currentLine.match(/^\d+\.\s$/);

        if (bulletMatch || numberMatch) {
            e.preventDefault();
            const deleteCount = bulletMatch ? 2 : numberMatch[0].length;
            for (let i = 0; i < deleteCount; i++) {
                document.execCommand('delete', false, null);
            }
            return;
        }
    }

    if (e.key === ' ') {
        if (currentLine === '-') {
            e.preventDefault();
            document.execCommand('delete', false, null);
            document.execCommand('insertText', false, '• ');
            return;
        }
    }

    if (e.key === '.') {
        const numberMatch = currentLine.match(/^\d+$/);
        if (numberMatch) {
            e.preventDefault();
            document.execCommand('insertText', false, '. ');
            return;
        }
    }
});

function saveCursorPosition() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        return selection.getRangeAt(0);
    }
    return null;
}

function restoreCursorPosition(range) {
    if (range) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

editor.addEventListener('input', () => {
    updateStats();
    resetAutoSave();
});

themeToggle.addEventListener('click', toggleTheme);

initTheme();
loadNotes();
setInterval(saveNotes, 30000);