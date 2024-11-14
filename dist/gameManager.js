import { languages } from './voices.js';
import { sendEvent } from './analytics.js';
import { getGuid, log, updateUrlParam } from "./utilities.js";
import { GameFactory } from "./Classes/GameFactory.js";
///////////////////// end ga
let words = [];
let game;
let testWord = 'hello';
let hasEnabledVoice = false;
let speakTimeout;
function populateTestSelect(selectElement, callback) {
    const guid = getGuid() || '64cdd390-6bb7-4a8b-b0e0-b52294368613';
    const scriptUrl = `./tests_lists/${guid}.js`;
    const existingScript = document.querySelector('script[data-source="test-list"]');
    if (existingScript)
        document.body.removeChild(existingScript);
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.setAttribute('data-source', 'test-list');
    document.body.appendChild(script);
    script.onload = () => {
        if (window['tests_list']) {
            window['tests_list'].forEach((item) => {
                const option = document.createElement('option');
                option.value = `words/${guid}/${item.scriptUrl}`;
                option.textContent = item.name;
                option.dataset.lang = item.lang;
                selectElement.appendChild(option);
            });
            callback();
        }
        else {
            console.error('Loaded script did not set the tests_list array.');
        }
    };
    script.onerror = (error) => {
        console.error('Error loading test list:', error);
    };
}
function initSelectsByURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const testSelectValue = urlParams.get('test');
    const gameTypeSelectValue = urlParams.get('gameType');
    if (testSelectValue !== null) {
        const testSelect = document.getElementById('testSelect');
        testSelect.selectedIndex = parseInt(testSelectValue, 10);
    }
    if (gameTypeSelectValue !== null) {
        const gameTypeSelect = document.getElementById('gameTypeSelect');
        gameTypeSelect.selectedIndex = parseInt(gameTypeSelectValue, 10);
    }
}
function loadSelectedTest() {
    const testSelect = document.getElementById('testSelect');
    const gameTypeSelect = document.getElementById('gameTypeSelect');
    sendEvent('loadSelectedTest', 'game controls', 'start new game', {
        game: testSelect.value,
        type: gameTypeSelect.value
    });
    setTimeout(() => {
        const selectedOption = testSelect.options[testSelect.selectedIndex];
        loadVoices(selectedOption.dataset.lang);
        loadWords().then(() => {
            buildGame(selectedOption.dataset.lang);
        });
        updateUrlParam('test', testSelect.selectedIndex.toString());
        updateUrlParam('gameType', gameTypeSelect.selectedIndex.toString());
    }, 500);
}
function saveSelectedVoice() {
    log('saveSelectedVoice ' + this.value);
    // Speak the testWord
    speakTimeout = setTimeout(() => {
        const testVoiceMessage = new SpeechSynthesisUtterance(testWord);
        testVoiceMessage.voice = speechSynthesis.getVoices().find(voice => voice.name === this.value);
        speechSynthesis.speak(testVoiceMessage);
    }, 500);
}
function loadVoices(language) {
    log('loadVoices ' + language);
    const voiceSelect = document.getElementById('voiceSelect');
    voiceSelect.innerHTML = '';
    let attempts = 0, maxAttempts = 50;
    voiceSelect.removeEventListener('change', saveSelectedVoice);
    voiceSelect.addEventListener('change', saveSelectedVoice);
    const checkVoices = () => {
        const voices = speechSynthesis.getVoices().filter(v => {
            const valid = v.lang.startsWith(`${language}-`);
            if (!valid) {
                log('checkVoices voice: ' + v.name + ' ' + v.lang + ' ' + valid);
            }
            return valid;
        });
        if (voices.length > 0 || attempts >= maxAttempts) {
            sendEvent('loadVoices', 'game controls', 'load voices', { language: language, voices: voices.length });
            testWord = languages[language].test_word;
            log('checkVoices voices: ' + voices.length);
            voices.forEach(voice => {
                const option = document.createElement('option');
                option.textContent = `${voice.name} (${voice.lang})`;
                option.value = voice.name;
                voiceSelect.appendChild(option);
            });
            loadVoiceSettings(language);
        }
        else {
            log('checkVoices will retry attempts: ' + attempts);
            attempts++;
            setTimeout(checkVoices, 50);
        }
    };
    checkVoices();
}
function loadVoiceSettings(language) {
    log('loadVoiceSettings');
    const savedVoiceName = localStorage.getItem('selectedVoice_' + language);
    const voiceSelect = document.getElementById('voiceSelect');
    if (savedVoiceName) {
        log('loadVoiceSettings savedVoiceName: ' + savedVoiceName);
        for (let i = 0; i < voiceSelect.options.length; i++) {
            if (voiceSelect.options[i].value === savedVoiceName) {
                log('savedVoiceName found loadVoiceSettings option.index: ' + i);
                voiceSelect.selectedIndex = i;
                break;
            }
        }
    }
}
function changeFontSize(change) {
    const words = document.querySelectorAll('.word, .translation');
    words.forEach(word => {
        const currentSize = parseInt(window.getComputedStyle(word, null).getPropertyValue('font-size'), 10);
        const newSize = currentSize + change;
        word.style.fontSize = `${newSize}px`;
    });
    // Save the new font size to local storage
    saveFontSizeToLocal(`${words[0].style.fontSize}`);
    sendEvent('changeFontSize', 'game controls', 'change font size', { change: change, size: words[0].style.fontSize });
}
function saveFontSizeToLocal(fontSize) {
    localStorage.setItem('fontSize', fontSize);
}
function loadFontSize() {
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
        const wordsElements = document.querySelectorAll('.word, .translation');
        wordsElements.forEach(word => {
            word.style.fontSize = savedFontSize;
        });
    }
}
function loadWords() {
    return new Promise((resolve, reject) => {
        const select = document.getElementById('testSelect');
        const scriptUrl = select.value;
        const existingScript = document.querySelector('script[data-source="dynamic-words"]');
        if (existingScript)
            document.body.removeChild(existingScript);
        const script = document.createElement('script');
        script.src = scriptUrl;
        script.setAttribute('data-source', 'dynamic-words');
        script.onload = () => {
            // Assuming the loaded script sets a global variable `loadedWords`
            if (window['words']) {
                words = window['words'];
                resolve();
            }
            else {
                reject(new Error('Loaded script did not set the words array.'));
            }
        };
        script.onerror = () => reject(new Error('Failed to load the script.'));
        document.body.appendChild(script);
    });
}
function buildGame(language) {
    log(`buildGame ${language}`);
    if (!words || !Array.isArray(words))
        return;
    const gameType = document.getElementById('gameTypeSelect').value;
    game = GameFactory.createGame(gameType, words, language);
    game.render();
    loadFontSize();
}
function closeSettings() {
    document.getElementById('menu').classList.remove('active');
}
document.addEventListener('click', function (event) {
    const menu = document.getElementById('menu');
    const toggleButton = document.getElementById('toggleMenuBtn');
    // Check if the menu is visible, the click is outside the menu, and not on the toggle button
    if (menu.classList.contains('active') &&
        !menu.contains(event.target) && // Check if click is not on a menu or its descendants
        !toggleButton.contains(event.target)) {
        menu.classList.remove('active'); // Hide the menu
    }
});
document.addEventListener('DOMContentLoaded', function () {
    log('DOMContentLoaded innerWidth= ' + window.innerWidth);
    const originalTestSelect = document.getElementById('testSelect');
    const gameTypeSelect = document.getElementById('gameTypeSelect');
    // document.getElementById('toggleMenuBtn').addEventListener('click', function () {
    //     const menu = document.getElementById('menu');
    //     menu.classList.toggle('active'); // This toggles the visibility and position of the menu
    //     sendEvent('toggleMenu', 'game controls', 'toggle menu', {active: menu.classList.contains('active')});
    // });
    document.getElementById('toggleMenuBtn').addEventListener('click', function () {
        const menu = document.getElementById('menu');
        const btnRect = this.getBoundingClientRect(); // Get button's position and dimensions
        menu.style.top = `${btnRect.bottom}px`; // Position menu below the button
        menu.style.left = `${btnRect.left}px`; // Align menu left edge with button left edge
        menu.classList.toggle('active'); // Toggle visibility
        sendEvent('toggleMenu', 'game controls', 'toggle menu', { active: menu.classList.contains('active') });
    });
    document.body.addEventListener('click', () => {
        const lecture = new SpeechSynthesisUtterance('hello');
        lecture.volume = 0;
        speechSynthesis.speak(lecture);
        hasEnabledVoice = true;
    }, { once: true }); //needed
    document.getElementById('increaseFont').addEventListener('click', () => changeFontSize(1));
    document.getElementById('decreaseFont').addEventListener('click', () => changeFontSize(-1));
    document.getElementById('newGameBtn').addEventListener('click', loadSelectedTest);
    document.getElementById('closeSettings').addEventListener('click', closeSettings);
    // Populate both dropdowns
    populateTestSelect(originalTestSelect, function () {
        // Add change event to original select
        originalTestSelect.addEventListener('change', loadSelectedTest);
        gameTypeSelect.addEventListener('change', loadSelectedTest);
        initSelectsByURL();
        if (window.innerWidth <= 1200) {
            const overlay = document.getElementById("overlay-start");
            overlay.style.display = "flex";
            // Clone the populated select
            const testSelectClone = originalTestSelect.cloneNode(true);
            testSelectClone.removeAttribute('id');
            testSelectClone.id = 'testSelectClone';
            // Add empty option only to clone
            let emptyOption = document.createElement('option');
            emptyOption.value = "";
            emptyOption.textContent = "בחירת הכתבה";
            testSelectClone.insertBefore(emptyOption, testSelectClone.firstChild);
            testSelectClone.selectedIndex = 0;
            testSelectClone.style.fontSize = '20px';
            // Create a control panel on the overlay
            const overlayControl = document.getElementById("overlay-control");
            overlayControl.appendChild(testSelectClone);
            testSelectClone.addEventListener('change', function () {
                document.body.removeChild(overlay);
                originalTestSelect.value = this.value;
                loadSelectedTest();
                const lecture = new SpeechSynthesisUtterance('hello');
                lecture.volume = 0;
                speechSynthesis.speak(lecture);
                hasEnabledVoice = true;
            });
        }
        else {
            loadSelectedTest();
        }
    });
});
