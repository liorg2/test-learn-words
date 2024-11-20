import { sendEvent } from './analytics.js';
import { getGuid, log, updateUrlParam } from "./utilities.js";
import { VoiceService } from './Services/VoiceService.js';
import { GameFactory } from "./Classes/GameFactory.js";
///////////////////// end ga
let words = [];
let game;
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
    const selectedOption = testSelect.options[testSelect.selectedIndex];
    VoiceService.getInstance().getVoices(selectedOption.dataset.lang).then((voices) => {
        fillVoicesOptions(selectedOption.dataset.lang, voices);
        loadWords().then(() => {
            buildGame(selectedOption.dataset.lang);
        });
        updateUrlParam('test', testSelect.selectedIndex.toString());
        updateUrlParam('gameType', gameTypeSelect.selectedIndex.toString());
    });
}
function fillVoicesOptions(language, voices) {
    const voiceSelect = document.getElementById('voiceSelect');
    voiceSelect.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.textContent = `קול ברירת מחדל (${language})`;
    defaultOption.value = '';
    voiceSelect.appendChild(defaultOption);
    const addedVoices = new Set();
    voices.forEach(voice => {
        if (!addedVoices.has(voice.name)) {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.value = voice.name;
            voiceSelect.appendChild(option);
            addedVoices.add(voice.name);
        }
    });
    selectVoice(language);
    initializeVoiceSelect();
}
function selectVoice(language) {
    const voiceSelect = document.getElementById('voiceSelect');
    const savedVoiceName = localStorage.getItem('selectedVoice__' + language);
    if (savedVoiceName) {
        log('selectVoice savedVoiceName: ' + savedVoiceName);
        for (let i = 0; i < this.voiceSelect.options.length; i++) {
            if (voiceSelect.options[i].value === savedVoiceName) {
                log('savedVoiceName found selectVoice option.index: ' + i);
                voiceSelect.selectedIndex = i;
                break;
            }
        }
    } else {
        // If no saved voice, select the default browser voice (first option)
        voiceSelect.selectedIndex = 0;
    }
}
function initializeVoiceSelect() {
    const voiceSelect = document.getElementById('voiceSelect');
    voiceSelect.addEventListener('change', handleVoiceChange);
}
function handleVoiceChange(event) {
    const voiceSelect = document.getElementById('voiceSelect');
    const selectedVoice = voiceSelect.value;
    const language = voiceSelect.options[voiceSelect.selectedIndex].value;
    localStorage.setItem('selectedVoice__' + language, selectedVoice);
}
// function saveSelectedVoice(this: HTMLSelectElement) {
//     log('saveSelectedVoice ' + this.value);
//
//     log('saveSelectedVoice ' + this.value);
//     localStorage.setItem(`selectedVoice__${this.dataset.lang}`, this.value);
//     voiceService.speak(testWord, this.dataset.lang);
//    
//
//     // // Speak the testWord
//     // speakTimeout = setTimeout(() => {
//     //     const testVoiceMessage = new SpeechSynthesisUtterance(testWord);
//     //     testVoiceMessage.voice = speechSynthesis.getVoices().find(voice => voice.name === this.value)!;
//     //     speechSynthesis.speak(testVoiceMessage);
//     // }, 500);
// }
// function loadVoiceSettings(language: string) {
//     log('loadVoiceSettings');
//     const savedVoiceName = localStorage.getItem('selectedVoice__' + language);
//     const voiceSelect = document.getElementById('voiceSelect') as HTMLSelectElement;
//     if (savedVoiceName) {
//         log('loadVoiceSettings savedVoiceName: ' + savedVoiceName);
//         for (let i = 0; i < voiceSelect.options.length; i++) {
//             if (voiceSelect.options[i].value === savedVoiceName) {
//                 log('savedVoiceName found loadVoiceSettings option.index: ' + i);
//                 voiceSelect.selectedIndex = i;
//                 break;
//             }
//         }
//     }
// }
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
    localStorage.setItem('_fontSize', fontSize);
}
function loadFontSize() {
    const savedFontSize = localStorage.getItem('_fontSize');
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
    const toggleSpeakerBtn = document.getElementById('toggleSpeakerBtn');
    // Check if the menu is visible, the click is outside the menu, and not on the toggle button
    if (menu.classList.contains('active') &&
        !menu.contains(event.target) && // Check if click is not on a menu or its descendants
        !toggleButton.contains(event.target) &&
        !toggleSpeakerBtn.contains(event.target)) {
        menu.classList.remove('active'); // Hide the menu
    }
});
let speakerEnabled = true; // Initially disabled
document.addEventListener('DOMContentLoaded', function () {
    log('DOMContentLoaded innerWidth= ' + window.innerWidth);
    const originalTestSelect = document.getElementById('testSelect');
    const gameTypeSelect = document.getElementById('gameTypeSelect');
    document.getElementById('toggleMenuBtn').addEventListener('click', function () {
        const menu = document.getElementById('menu');
        const btnRect = this.getBoundingClientRect(); // Get button's position and dimensions
        menu.style.top = `${btnRect.bottom + 10}px`; // Position menu below the button
        menu.style.left = `${btnRect.left - 5}px`; // Align menu left edge with button left edge
        menu.classList.toggle('active'); // Toggle visibility
        sendEvent('toggleMenu', 'game controls', 'toggle menu', { active: menu.classList.contains('active') });
    });
    const toggleSpeakerBtn = document.getElementById('toggleSpeakerBtn');
    toggleSpeakerBtn.addEventListener('click', function () {
        log('toggleSpeakerBtn clicked speakerEnabled= ' + speakerEnabled);
        speakerEnabled = !speakerEnabled; // Toggle the state
        localStorage.setItem('speakerEnabled', speakerEnabled.toString());
        updateSpeakerIcon();
        if (speakerEnabled) {
            VoiceService.getInstance().speak('Hello', 'en', 0);
        }
    });
    if (new URLSearchParams(window.location.search).has('log')) {
        document.getElementById('log').style.display = 'block';
    }
    function updateSpeakerIcon() {
        if (speakerEnabled) {
            toggleSpeakerBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
        else {
            toggleSpeakerBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        }
    }
    // Initialize icon state on load
    updateSpeakerIcon();
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
                VoiceService.getInstance().speak('Lets get started!', 'en', 1).then(() => {
                    loadSelectedTest();
                });
            });
        }
        else {
            loadSelectedTest();
        }
    });
});
