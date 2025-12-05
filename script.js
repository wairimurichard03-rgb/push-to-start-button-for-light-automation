
document.addEventListener('DOMContentLoaded', () => {
    // --- DATA MODELS ---
    const buttons = [
        { id: 'btn1', name: 'Bedside Button' },
        { id: 'btn2', name: 'Living Room Button' }
    ];

    const lights = [
        { id: 'light1', name: 'Bedroom Lamp', isOn: false, brightness: 100, color: '#ffffff' },
        { id: 'light2', name: 'Living Room Main', isOn: false, brightness: 100, color: '#ffffff' },
        { id: 'light3', name: 'Hallway Light', isOn: false, brightness: 30, color: '#ffdd99' }
    ];

    const scenes = {
        goodnight: { name: 'Goodnight', actions: [{ type: 'allOff' }] },
        movieTime: { name: 'Movie Time', actions: [{ type: 'setLight', targetId: 'light2', state: { isOn: true, brightness: 20, color: '#4a0080' } }] },
        lateNightBathroom: { name: 'Late Night Bathroom', actions: [{ type: 'setLight', targetId: 'light3', state: { isOn: true, brightness: 10, color: '#ffdd99' } }, { type: 'delay', ms: 30000 }, { type: 'setLight', targetId: 'light3', state: { isOn: false } }] }
    };

    let config = {
        btn1: { single: 'goodnight', double: 'movieTime', long: 'lateNightBathroom' },
        btn2: { single: 'movieTime', double: 'allLightsOn', long: 'allLightsOff' }
    };

    // --- DOM ELEMENTS ---
    const buttonsContainer = document.getElementById('buttons-container');
    const lightsContainer = document.getElementById('lights-container');
    const configModal = document.getElementById('config-modal');
    const configFormContainer = document.getElementById('config-form-container');
    const notificationEl = document.getElementById('notification');

    // --- INITIALIZATION ---
    function initializeApp() {
        loadConfig();
        renderButtons();
        renderLights();
        setupEventListeners();
    }

    // --- RENDERING FUNCTIONS ---
    function renderButtons() {
        buttonsContainer.innerHTML = '';
        buttons.forEach(btn => {
            const buttonEl = document.createElement('button');
            buttonEl.className = 'smart-button';
            buttonEl.id = btn.id;
            buttonEl.textContent = btn.name.replace(' ', '\n');
            buttonsContainer.appendChild(buttonEl);
        });
    }

    function renderLights() {
        lightsContainer.innerHTML = '';
        lights.forEach(light => {
            const lightEl = document.createElement('div');
            lightEl.className = 'light';
            lightEl.innerHTML = `
                <div class="light-bulb ${light.isOn ? 'on' : ''}" id="${light.id}-bulb" style="background-color: ${light.isOn ? light.color : 'var(--light-off)'}; color: ${light.color};"></div>
                <p>${light.name}</p>
            `;
            lightsContainer.appendChild(lightEl);
        });
    }

    // --- CONFIGURATION ---
    function setupEventListeners() {
        // Button press logic
        let pressTimer;
        document.querySelectorAll('.smart-button').forEach(button => {
            button.addEventListener('mousedown', startPress);
            button.addEventListener('mouseup', endPress);
            button.addEventListener('mouseleave', cancelPress); // Cancel if mouse leaves
            button.addEventListener('touchstart', startPress, { passive: true });
            button.addEventListener('touchend', endPress);
        });

        // Modal logic
        document.getElementById('settings-btn').onclick = () => { configModal.style.display = 'block'; renderConfigForm(); };
        document.querySelector('.close-btn').onclick = () => { configModal.style.display = 'none'; };
        window.onclick = (event) => { if (event.target == configModal) { configModal.style.display = 'none'; } };
        document.getElementById('save-config-btn').onclick = saveConfig;
    }

    function renderConfigForm() {
        configFormContainer.innerHTML = '';
        buttons.forEach(btn => {
            const group = document.createElement('div');
            group.className = 'config-group';
            group.innerHTML = `
                <h3>${btn.name}</h3>
                <label>Single Press:</label>
                <select id="${btn.id}-single">${createSceneOptions(btn.id, 'single')}</select>
                <label>Double Press:</label>
                <select id="${btn.id}-double">${createSceneOptions(btn.id, 'double')}</select>
                <label>Long Press:</label>
                <select id="${btn.id}-long">${createSceneOptions(btn.id, 'long')}</select>
            `;
            configFormContainer.appendChild(group);
        });
    }

    function createSceneOptions(buttonId, pressType) {
        let options = '<option value="">-- Do Nothing --</option>';
        for (const key in scenes) {
            const selected = config[buttonId][pressType] === key ? 'selected' : '';
            options += `<option value="${key}" ${selected}>${scenes[key].name}</option>`;
        }
        // Add special actions
        const allOnSelected = config[buttonId][pressType] === 'allLightsOn' ? 'selected' : '';
        const allOffSelected = config[buttonId][pressType] === 'allLightsOff' ? 'selected' : '';
        options += `<option value="allLightsOn" ${allOnSelected}>Turn All Lights On</option>`;
        options += `<option value="allLightsOff" ${allOffSelected}>Turn All Lights Off</option>`;
        return options;
    }

    function saveConfig() {
        buttons.forEach(btn => {
            config[btn.id] = {
                single: document.getElementById(`${btn.id}-single`).value,
                double: document.getElementById(`${btn.id}-double`).value,
                long: document.getElementById(`${btn.id}-long`).value,
            };
        });
        localStorage.setItem('automationConfig', JSON.stringify(config));
        configModal.style.display = 'none';
        showNotification('Configuration Saved!');
    }

    function loadConfig() {
        const savedConfig = localStorage.getItem('automationConfig');
        if (savedConfig) {
            config = JSON.parse(savedConfig);
        }
    }

    // --- BUTTON PRESS LOGIC ---
    function startPress(e) {
        const buttonId = e.target.id;
        cancelPress(); // Clear any existing timers
        e.target.classList.add('active');
        pressTimer = setTimeout(() => {
            handleAction(buttonId, 'long');
            cancelPress();
        }, 500); // 500ms for long press
    }

    function endPress(e) {
        const buttonId = e.target.id;
        e.target.classList.remove('active');
        if (pressTimer) {
            const elapsed = Date.now() - pressTimer.startTime;
            if (elapsed < 250) { // It was a quick press, could be a single or double
                if (!pressTimer.isPending) {
                    pressTimer.isPending = true;
                    pressTimer.action = () => handleAction(buttonId, 'single');
                    setTimeout(() => { // Wait for a potential second press
                        if (pressTimer.isPending) {
                            pressTimer.action();
                            cancelPress();
                        }
                    }, 250);
                } else { // Second press detected
                    cancelPress();
                    handleAction(buttonId, 'double');
                }
            }
        }
    }

    function cancelPress() {
        if (pressTimer) {
            clearTimeout(pressTimer.timer);
            pressTimer = null;
        }
    }

    // --- ACTION & SCENE EXECUTION ---
    async function handleAction(buttonId, pressType) {
        const actionKey = config[buttonId]?.[pressType];
        if (!actionKey) return;

        showNotification(`Triggered: ${actionKey}`);
        
        // Simulate a call to a backend API
        try {
            const response = await fetch('api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: actionKey })
            });
            const result = await response.json();
            console.log('Server response:', result);
        } catch (error) {
            console.error('API call failed:', error);
        }

        // Execute the action locally for immediate UI feedback
        if (scenes[actionKey]) {
            executeScene(scenes[actionKey]);
        } else if (actionKey === 'allLightsOn') {
            lights.forEach(light => setLightState(light.id, { isOn: true }));
        } else if (actionKey === 'allLightsOff') {
            lights.forEach(light => setLightState(light.id, { isOn: false }));
        }
    }

    async function executeScene(scene) {
        for (const action of scene.actions) {
            if (action.type === 'setLight') {
                setLightState(action.targetId, action.state);
            } else if (action.type === 'allOff') {
                lights.forEach(light => setLightState(light.id, { isOn: false }));
            } else if (action.type === 'delay') {
                await new Promise(resolve => setTimeout(resolve, action.ms));
            }
        }
    }

    function setLightState(lightId, state) {
        const light = lights.find(l => l.id === lightId);
        if (!light) return;
        
        Object.assign(light, state);
        const bulbEl = document.getElementById(`${lightId}-bulb`);
        if (bulbEl) {
            bulbEl.className = `light-bulb ${light.isOn ? 'on' : ''}`;
            bulbEl.style.backgroundColor = light.isOn ? light.color : 'var(--light-off)';
            bulbEl.style.color = light.color;
        }
    }

    function showNotification(message) {
        notificationEl.textContent = message;
        notificationEl.classList.add('show');
        setTimeout(() => {
            notificationEl.classList.remove('show');
        }, 3000);
    }

    // --- START THE APP ---
    initializeApp();
});
