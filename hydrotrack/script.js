let currentAmount = 0;
let goal = 3000;
let history = [];
let lastDate = localStorage.getItem('lastDate') || new Date().toISOString().slice(0, 10);
let firstTimeSettingGoal = localStorage.getItem('firstTimeSettingGoal') !== 'false';
let animatedProgress = 0;

const currentUrl = window.location.href;
const getColor = (percentage) => `hsl(${120 * (percentage / 100)}, 70%, 45%)`;
const discordLoginM = document.getElementById('discordLoginM');

const SUPABASE_URL = 'https://kxejefkdnhcmpbccnkyn.supabase.co/';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4ZWplZmtkbmhjbXBiY2Nua3luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDE4NTksImV4cCI6MjA2ODE3Nzg1OX0.LdJvLDdGF60DeKuHpjG2NHc-5Sy5ns9jkcFw3RnVu5k';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
	headers: {
		'apikey': SUPABASE_KEY,
		'Authorization': `Bearer ${SUPABASE_KEY}`
	}
});

document.getElementById("setFirstGoal").addEventListener("click", firstUpdateGoal);
document.getElementById("addCustomValue").addEventListener("click", addDrink);
document.getElementById("removeCustomValue").addEventListener("click", removeDrink);
document.querySelectorAll('[data-add-value]').forEach(button => {
    button.addEventListener('click', () => {
        const value = parseInt(button.getAttribute('data-add-value')) || 0;
        if (value > 0) addAmount(value);
    });
});

async function signInWithDiscord() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
            redirectTo: window.location.href
        }
    });
    if (error) console.error(error);
}

async function saveToSupabase() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.log('Not saving to Supabase - no user');
            return;
        }

        if (currentAmount === 0) {
            const { error: tempError } = await supabase
                .from('user_data')
                .upsert({
                    id: user.id,
                    current_amount: 1,
                    goal: goal,
                    history: history,
                    last_date: lastDate
                }, {
                    onConflict: 'id'
                });
            
            if (tempError) {
                console.error('Temporary save error:', tempError);
                return;
            }
            
            const { error } = await supabase
                .from('user_data')
                .upsert({
                    id: user.id,
                    current_amount: 0,
                    goal: goal,
                    history: history,
                    last_date: lastDate
                }, {
                    onConflict: 'id'
                });
            
            if (error) {
                console.error('Supabase save error:', error);
            } else {
                console.log('Data saved to Supabase (with workaround)');
            }
            return;
        }

        const { error } = await supabase
            .from('user_data')
            .upsert({
                id: user.id,
                current_amount: currentAmount,
                goal: goal,
                history: history,
                last_date: lastDate
            }, {
                onConflict: 'id'
            });

        if (error) {
            console.error('Supabase save error:', error);
        } else {
            console.log('Data saved to Supabase');
        }
    } catch (error) {
        console.error('Unexpected error in saveToSupabase:', error);
    }
}

if (discordLoginM) {
    discordLoginM.addEventListener('click', signInWithDiscord);
}

async function loadFromSupabase() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.log('No user logged in, loading from localStorage');
            return loadLocalData();
        }

        const { data, error } = await supabase
            .from('user_data')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (!data && !error) {
            console.log('No data found for user, creating new record');
            
            const newRecord = {
                current_amount: currentAmount,
                goal: goal,
                history: history,
                last_date: new Date().toISOString().slice(0, 10)
            };
            
            const { error: createError } = await supabase
                .from('user_data')
                .insert({
                    id: user.id,
                    ...newRecord
                });

            if (createError) {
                console.error('Create error:', createError);
                return loadLocalData();
            }
            
            console.log('New record created successfully');
            updateDisplay();
            updateHistory();
            return true;
        }

        if (error) {
            console.error('Supabase load error:', error);
            return loadLocalData();
        }

        currentAmount = data.current_amount;
        goal = data.goal;
        history = data.history || [];
        lastDate = data.last_date || new Date().toISOString().slice(0, 10);
        
        localStorage.setItem('hydroData', JSON.stringify({
            current: currentAmount,
            goal: goal,
            date: new Date().toISOString().slice(0, 10),
            history: history
        }));
        
        updateDisplay();
        updateHistory();
        return true;
    } catch (error) {
        console.error('Unexpected error in loadFromSupabase:', error);
        return loadLocalData();
    }
}

function loadLocalData() {
    const today = new Date().toISOString().slice(0, 10);
    const saved = JSON.parse(localStorage.getItem('hydroData')) || {
        current: 0,
        goal: 3000,
        date: today,
        history: []
    };
    if (saved.date !== today) {
        if (saved.current > 0) {
            history = saved.history || [];
            history.push({ 
                date: saved.date, 
                amount: saved.current, 
                goal: saved.goal 
            });
        }
        currentAmount = 0;
        saved.date = today;
    } else {
        currentAmount = saved.current;
        history = saved.history || [];
    }

    goal = saved.goal || 3000;
    
    lastDate = saved.date || today;
    
    return true;
}

function removeDrink() {
    const amount = parseInt(document.getElementById('removeAmount').value) || 0;
    if (amount > 0) subtractAmount(amount);
    document.getElementById('removeAmount').value = "";
}

function subtractAmount(amount) {
    if (currentAmount <= 0 || amount <= 0) return;
    const newAmount = currentAmount - amount;
    if (newAmount < 0) return;

    currentAmount = newAmount;
    saveData();
    updateDisplay();
    animateChange(-amount);
}

function addDrink() {
    const amount = parseInt(document.getElementById('amount').value) || 0;
    if (amount > 0) addAmount(amount);
}

function addAmount(amount) {
    currentAmount += amount;
    saveData();
    updateDisplay();
    animateChange(amount);
}

function animateChange(amount) {
    const anim = document.createElement('div');
    anim.textContent = `${amount > 0 ? '+' : ''}${amount}ml`;
    anim.style.cssText = `
        position: absolute;
        color: ${amount > 0 ? getColor((currentAmount / goal) * 100) : '#ff0000'};
        animation: floatUp 1s ease-out;
        font-weight: bold;
        pointer-events: none;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
    `;
    document.body.appendChild(anim);
    setTimeout(() => anim.remove(), 1000);
}

async function loadData() {
    loadLocalData();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await loadFromSupabase();
    }
    
    if (firstTimeSettingGoal) {
        document.getElementById('setup-overlay').style.display = 'block';
        document.getElementById('firstGoalInput').style.display = 'block';
        document.querySelector('.bg-blur').style.display = 'block';
    } else {
        document.getElementById('setup-overlay')?.remove();
    }
    
    updateDisplay();
    updateHistory();
}

function saveData() {
    const today = new Date().toISOString().slice(0, 10);
    const dataToSave = {
        current: currentAmount,
        goal: goal,
        date: today,
        history: history
    };

    localStorage.setItem('hydroData', JSON.stringify(dataToSave));
    localStorage.setItem('lastDate', today);

    saveToSupabase();
}

function updateGoal() {
    const newGoal = parseInt(document.getElementById('goalInput').value) || 3000;
    goal = Math.max(newGoal, 500);
    saveData();
    updateDisplay();

    const element = document.getElementById("event-action-tooltip");
    element.innerText = `Updated successfully`;
    element.style.color = '#28a745';
    setTimeout(() => {
        element.innerText = ``;
        element.style = '';
    }, 3000);
}

function firstUpdateGoal(event) {
    event.preventDefault();
    const value = parseInt(document.getElementById('firstGoalInput').value);
    if (!isNaN(value) && value > 0) {
        goal = Math.max(value, 500);
        localStorage.setItem('firstTimeSettingGoal', 'false');
        saveData();
        updateDisplay();
        setTimeout(() => location.reload(), 200);
    } else {
        alert('Please enter a positive/valid number.');
    }
}

function updateDisplay() {
    const targetProgress = Math.min((currentAmount / goal) * 100, 100);
    document.getElementById('currentProgress').textContent = currentAmount;
    document.getElementById('currentGoal').textContent = goal;
    document.getElementById('progressText').textContent = `${targetProgress.toFixed(1)}%`;
    animateProgress(animatedProgress, targetProgress);
}

function animateProgress(start, end) {
    const duration = 500;
    const startTime = performance.now();

    function step(timestamp) {
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = start + (end - start) * progress;
        const circle = document.getElementById('progressCircle');

        if (circle) {
            const color = getColor(current);
            circle.style.background = `conic-gradient(${color} ${current}%, #e9ecef ${current}% 100%)`;
        }

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            animatedProgress = end;
        }
    }

    requestAnimationFrame(step);
}

function updateHistory() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    const uniqueHistory = new Map();
    history.forEach(entry => {
        if (!uniqueHistory.has(entry.date)) {
            uniqueHistory.set(entry.date, entry);
        }
    });

    const entries = Array.from(uniqueHistory.values())
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    historyList.innerHTML = entries.length > 0
        ? entries.map(entry => `
            <div class="history-item" data-date="${entry.date}">
                <div>${entry.date}</div>
                <div>${entry.amount}ml / ${entry.goal}ml</div>
            </div>
        `).join('')
        : `<a>No history yet!</a><br><a>Keep tracking your drinks to get a list, or import an existing one below.</a>`;
}

document.getElementById("fileExport").addEventListener("click", function() {
    exportData();
});

document.getElementById("versionFileExport").addEventListener("click", function() {
    exportData();
});

document.getElementById("fileImport").addEventListener("click", function() {
    document.getElementById("importAction").style.display = "block";
    document.getElementById("import-action").innerText = `Your current data will be overwritten when importing!`;
    setTimeout(() => {
        document.getElementById('importFile').click()
        setTimeout(() => {
            document.getElementById("importAction").style.display = "none";
            document.getElementById("import-action").innerText = ``;
        }, 2500);
    }, 500);
});

function exportData() {
    const data = {
        current: currentAmount,
        goal: goal,
        date: new Date().toISOString().slice(0, 10),
        history: history
    };

    const today = new Date().toISOString().slice(0, 10);
    const fileName = `HydroTrack_Data_${today}.json`;

    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (
                typeof importedData.current === 'number' &&
                typeof importedData.goal === 'number' &&
                typeof importedData.date === 'string' &&
                Array.isArray(importedData.history)
            ) {
                localStorage.setItem('hydroData', JSON.stringify(importedData));
                
                currentAmount = importedData.current;
                goal = importedData.goal;
                history = importedData.history;
                lastDate = importedData.date;
                
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { error } = await supabase
                        .from('user_data')
                        .upsert({
                            id: user.id,
                            current_amount: importedData.current,
                            goal: importedData.goal,
                            history: importedData.history,
                            last_date: importedData.date
                        }, {
                            onConflict: 'id'
                        });
                    
                    if (error) {
                        console.error('Supabase import error:', error);
                        alert('Failed to save imported data to Supabase!');
                    }
                }
                
                updateDisplay();
                updateHistory();
                saveData();
                
                alert('Data imported successfully!');
            } else {
                alert('Invalid data format.');
            }
        } catch (error) {
            alert('Error importing file.');
        }
    };
    reader.readAsText(file);
}

async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout error:', error);
    else location.reload();
}

async function updateLoginButton() {
    const loginButton = document.getElementById('discordLogin');
    const loginButtonM = document.getElementById('discordLoginM');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (loginButton) {
        if (user) {
            loginButton.innerHTML = '<i class="fab fa-discord"></i> Logout';
            loginButton.onclick = signOut;
        } else {
            loginButton.innerHTML = '<i class="fab fa-discord"></i> Login';
            loginButton.onclick = signInWithDiscord;
        }
    }
    
    if (loginButtonM) {
        if (user) {
            loginButtonM.innerHTML = '<i class="fab fa-discord"></i> Logout';
            loginButtonM.onclick = signOut;
        } else {
            loginButtonM.innerHTML = '<i class="fab fa-discord"></i> Login';
            loginButtonM.onclick = signInWithDiscord;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const root = document.documentElement;
    
    document.getElementById('discordLogin').onclick = signInWithDiscord;

    if (!localStorage.getItem('darkMode')) {
        localStorage.setItem('darkMode', 'enabled');
        location.reload();
        return;
    }

    const darkModePreference = localStorage.getItem('darkMode');
    if (darkModePreference === 'enabled') {
        root.classList.add('dark');
        root.classList.remove('light');
        themeToggle.classList.remove('light');
        themeToggle.classList.add('dark');
    } else {
        root.classList.add('light');
        root.classList.remove('dark');
        themeToggle.classList.remove('dark');
        themeToggle.classList.add('light');
    }

    updateDisplay();

    themeToggle.addEventListener('click', () => {
        const isDark = root.classList.contains('dark');

        if (isDark) {
            root.classList.remove('dark');
            root.classList.add('light');
            themeToggle.classList.remove('dark');
            themeToggle.classList.add('light');
            localStorage.setItem('darkMode', 'disabled');
        } else {
            root.classList.add('dark');
            root.classList.remove('light');
            themeToggle.classList.remove('light');
            themeToggle.classList.add('dark');
            localStorage.setItem('darkMode', 'enabled');
        }

        updateDisplay();
    });

    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event);
        if (event === 'SIGNED_IN' && session?.user) {
            loadFromSupabase();
        } else if (event === 'SIGNED_OUT') {
            loadData();
        }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
            loadFromSupabase();
        } else {
            loadData();
        }
    });

    const mobileLoginBtn = document.getElementById('discordLoginM');
    if (mobileLoginBtn) {
        mobileLoginBtn.onclick = signInWithDiscord;
    }

    updateLoginButton();
    setInterval(updateLoginButton, 5000);
});

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) loadData();
});

if (currentUrl.endsWith("?") || currentUrl.endsWith("/?")) {
    const cleanedUrl = currentUrl.replace(/\?$/, "");
    window.location.replace(cleanedUrl);
}

if (currentUrl.endsWith("#") || currentUrl.endsWith("/#")) {
    const cleanedUrl = currentUrl.replace(/\#$/, "");
    window.location.replace(cleanedUrl);
}

function startSupabasePolling() {
    setInterval(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('user_data')
            .select('current_amount, goal, history, last_date')
            .eq('id', user.id)
            .single();

        if (error || !data) return;

        if (data.current_amount !== currentAmount || 
            data.goal !== goal || 
            JSON.stringify(data.history) !== JSON.stringify(history)) {
            loadFromSupabase();
        }
    }, 1000);
}

document.addEventListener('DOMContentLoaded', startSupabasePolling);