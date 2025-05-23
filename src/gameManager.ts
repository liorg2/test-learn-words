import {languages} from './voices.js';
import {sendEvent} from './analytics.js';
import {getGuid, log, updateUrlParam} from "./utilities.js";
import {GameWord} from "./globalTypes.js";
import {Game} from "./Classes/Game.js";
import {VoiceService} from './Services/VoiceService.js';

import {GameFactory} from "./Classes/GameFactory.js";


///////////////////// end ga

let words: GameWord[] = [];
let game: Game;


function populateTestSelect(selectElement: HTMLSelectElement, callback: () => void): void {
    const guid = getGuid() || '64cdd390-6bb7-4a8b-b0e0-b52294368613';
    const scriptUrl = `./tests_lists/${guid}.js`;

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-source="test-list"]');
    if (existingScript) document.body.removeChild(existingScript);
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.setAttribute('data-source', 'test-list');
    document.body.appendChild(script);
    script.onload = () => {
        if (window['tests_list']) {
            // Group by lang
            const groups = {};
            window['tests_list'].forEach((item: { scriptUrl: string; name: string; lang: string }) => {
                if (!groups[item.lang]) groups[item.lang] = [];
                groups[item.lang].push(item);
            });
            // Clear previous options
            selectElement.innerHTML = '';
            // Language display names
            const langNames: Record<string, string> = { en: 'אנגלית', fr: 'צרפתית', sp: 'ספרדית', it: 'איטלקית', he: 'עברית' };
            Object.keys(groups).forEach(lang => {
                const optgroup = document.createElement('optgroup');
                optgroup.label = langNames[lang] || lang;
                groups[lang].forEach((item: { scriptUrl: string; name: string; lang: string }) => {
                    const option = document.createElement('option');
                    option.value = `words/${guid}/${item.scriptUrl}`;
                    option.textContent = item.name;
                    option.dataset.lang = item.lang;
                    optgroup.appendChild(option);
                });
                selectElement.appendChild(optgroup);
            });
            callback();
        } else {
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
        const testSelect = document.getElementById('testSelect') as HTMLSelectElement;
        testSelect.selectedIndex = parseInt(testSelectValue, 10);
    }

    const tabs = document.querySelectorAll('.game-type-tab');
    let foundActiveTab = false;
    
    if (gameTypeSelectValue !== null) {
        tabs.forEach(tab => {
            if (tab.getAttribute('data-game-type') === gameTypeSelectValue) {
                tab.classList.add('active');
                foundActiveTab = true;
            } else {
                tab.classList.remove('active');
            }
        });
    }
    
    // If no tab is active (either no URL param or invalid value), activate the first tab
    if (!foundActiveTab) {
        tabs[0].classList.add('active');
    }
}


function loadSelectedTest() {
    const testSelect = document.getElementById('testSelect') as HTMLSelectElement;
    const activeTab = document.querySelector('.game-type-tab.active') as HTMLElement;
    const gameType = activeTab.getAttribute('data-game-type');

    // Hide new game buttons
    const newGameBtn = document.getElementById('newGameBtn');
    const newGameBtnBottom = document.getElementById('newGameBtnBottom');
    newGameBtn.style.display = 'none';
    newGameBtnBottom.style.display = 'none';
    newGameBtn.classList.remove('blink-once');
    newGameBtnBottom.classList.remove('blink-once');

    sendEvent('loadSelectedTest', 'game controls', 'start new game', {
        game: testSelect.value,
        type: gameType
    });

    // Clear any existing game containers to prevent double rendering
    clearGameContainers();

    const selectedOption = testSelect.options[testSelect.selectedIndex];
    VoiceService.getInstance().getVoices(selectedOption.dataset.lang!).then((voices: SpeechSynthesisVoice[]) => {
        fillVoicesOptions(selectedOption.dataset.lang!, voices);

        loadWords().then(() => {
            // Reset UI elements before building the game
            // Show/hide pagination based on game type
            const paginationContainer = document.getElementById('paginationContainer');
            if (paginationContainer) {
                if (gameType === 'fallingWords' || gameType === 'wordSearch') {
                    paginationContainer.style.display = 'none';
                } else {
                    paginationContainer.style.display = '';
                    paginationContainer.innerHTML = ''; // Clear previous pagination
                }
            }
            
            // Reset containers to default visibility
            const wordContainer = document.getElementById('wordContainer');
            const targetContainer = document.getElementById('targetContainer');
            if (wordContainer) wordContainer.style.display = '';
            if (targetContainer) targetContainer.style.display = '';
            
            // Build the game after UI reset
            buildGame(selectedOption.dataset.lang!);
        });

        updateUrlParam('test', testSelect.selectedIndex.toString());
        updateUrlParam('gameType', gameType);
    });
}

function fillVoicesOptions(language: string, voices: SpeechSynthesisVoice[]) {
    const voiceSelect = document.getElementById('voiceSelect') as HTMLSelectElement;
    voiceSelect.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.textContent = `קול ברירת מחדל (${language})`;
    defaultOption.value = '';
    voiceSelect.appendChild(defaultOption);

    const addedVoices = new Set<string>();

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
    initializeVoiceSelectEvents();
}


function selectVoice(language: string) {

    const voiceSelect = document.getElementById('voiceSelect') as HTMLSelectElement;
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

function initializeVoiceSelectEvents() {
    const voiceSelect = document.getElementById('voiceSelect') as HTMLSelectElement;
    voiceSelect.addEventListener('change', handleVoiceChange);
}

function handleVoiceChange(event: Event) {
    const voiceSelect = document.getElementById('voiceSelect') as HTMLSelectElement;
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

function changeFontSize(change: number) {
    const words = document.querySelectorAll<HTMLElement>('.word, .translation');
    if (words.length === 0) return; // No words to resize
    
    // Get current size from the first word
    const currentSize = parseInt(window.getComputedStyle(words[0], null).getPropertyValue('font-size'), 10);
    const newSize = currentSize + change;
    const newSizeWithUnit = `${newSize}px`;
    
    // Update individual elements
    words.forEach(word => {
        word.style.fontSize = newSizeWithUnit;
    });
    
    // Update or create the style element for consistent sizing
    let fontSizeStyle = document.getElementById('dynamic-font-size');
    if (!fontSizeStyle) {
        fontSizeStyle = document.createElement('style');
        fontSizeStyle.id = 'dynamic-font-size';
        document.head.appendChild(fontSizeStyle);
    }
    
    // Update the style to apply to all .word and .translation elements, including future ones
    fontSizeStyle.textContent = `
        .word, .translation {
            font-size: ${newSizeWithUnit} !important;
        }
    `;
    
    // Save the new font size to local storage
    saveFontSizeToLocal(newSizeWithUnit);
    sendEvent('changeFontSize', 'game controls', 'change font size', {change: change, size: newSizeWithUnit});
}

function saveFontSizeToLocal(fontSize: string) {
    localStorage.setItem('_fontSize', fontSize);
}

function loadFontSize() {
    const savedFontSize = localStorage.getItem('_fontSize');
    if (savedFontSize) {
        // Apply to all current elements
        const wordsElements = document.querySelectorAll<HTMLElement>('.word, .translation');
        wordsElements.forEach(word => {
            word.style.fontSize = savedFontSize;
        });
        
        // Also create a style tag to ensure consistency across all pages
        let fontSizeStyle = document.getElementById('dynamic-font-size');
        if (!fontSizeStyle) {
            fontSizeStyle = document.createElement('style');
            fontSizeStyle.id = 'dynamic-font-size';
            document.head.appendChild(fontSizeStyle);
        }
        
        // Update the style to apply to all .word and .translation elements, including future ones
        fontSizeStyle.textContent = `
            .word, .translation {
                font-size: ${savedFontSize} !important;
            }
        `;
        
        // Update slider value if it exists
        const fontSizeSlider = document.getElementById('fontSizeSlider') as HTMLInputElement;
        if (fontSizeSlider) {
            // Extract numeric value from saved font size (e.g., "16px" -> 16)
            const numericSize = parseInt(savedFontSize.replace('px', ''), 10);
            if (!isNaN(numericSize)) {
                fontSizeSlider.value = numericSize.toString();
            }
        }
    }
}


function loadWords(): Promise<void> {
    return new Promise((resolve, reject) => {
        const select = document.getElementById('testSelect') as HTMLSelectElement;
        const scriptUrl = select.value;
        const existingScript = document.querySelector<HTMLScriptElement>('script[data-source="dynamic-words"]');
        if (existingScript) document.body.removeChild(existingScript);

        const script = document.createElement('script');
        script.src = scriptUrl;
        script.setAttribute('data-source', 'dynamic-words');

        script.onload = () => {
            // Assuming the loaded script sets a global variable `loadedWords`
            if (window['words']) {
                words = window['words'];
                resolve();
            } else {
                reject(new Error('Loaded script did not set the words array.'));
            }
        };
        script.onerror = () => reject(new Error('Failed to load the script.'));
        document.body.appendChild(script);
    });
}


function buildGame(language: string) {
    log(`buildGame ${language}`);
    if (!words || !Array.isArray(words)) return;

    let activeTab = document.querySelector('.game-type-tab.active') as HTMLElement;
    if (!activeTab) {
        const firstTab = document.querySelector('.game-type-tab') as HTMLElement;
        firstTab.classList.add('active');
        activeTab = firstTab;
    }
    
    const gameType = activeTab.getAttribute('data-game-type');
    
    // Set the game type attribute on the body for CSS selection
    document.body.setAttribute('data-game-type', gameType);
    
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
        !menu.contains(event.target as Node) && // Check if click is not on a menu or its descendants
        !toggleButton.contains(event.target as Node) &&
        !toggleSpeakerBtn.contains(event.target as Node)) {
        menu.classList.remove('active'); // Hide the menu
    }
});

let speakerEnabled = false;  // Initially disabled
sessionStorage.setItem('speakersEnabled', speakerEnabled.toString());// reset speaker state


function updateSpeakerIcon() {
    const toggleSpeakerBtn = document.getElementById('toggleSpeakerBtn');
    if (speakerEnabled) {
        toggleSpeakerBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        toggleSpeakerBtn.classList.remove('blink-once');
    } else {
        toggleSpeakerBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        toggleSpeakerBtn.classList.add('blink-once');
    }
}

// Setup fullscreen functionality for all games
function setupFullscreenToggle() {
    debugger
    const fullscreenButton = document.getElementById('fullscreenButton');
    
    if (fullscreenButton) {
        // Use CSS classes to control visibility instead of inline styles
        fullscreenButton.classList.add('flex');
        
        fullscreenButton.addEventListener('click', () => {
            toggleGameFullscreen();
            sendEvent('fullscreenButton', 'game controls', 'toggle fullscreen', {});
        });
    }
    
    // Check for Escape key to exit fullscreen mode
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('game-fullscreen-mode')) {
            exitGameFullscreen();
        }
    });
}

function toggleGameFullscreen() {
    if (document.body.classList.contains('game-fullscreen-mode')) {
        exitGameFullscreen();
    } else {
        enterGameFullscreen();
    }
}

function enterGameFullscreen() {
    // Add fullscreen class to body
    document.body.classList.add('game-fullscreen-mode');
    
    // Make sure to update the button state even if it's hidden
    const fullscreenButton = document.getElementById('fullscreenButton');
    if (fullscreenButton) {
        fullscreenButton.innerHTML = '<i class="fas fa-compress"></i>';
    }
    
    // Move statistics inside the game area
    const statistics = document.querySelector('.statistics') as HTMLElement;
    const gameArea = document.querySelector('.game-area') as HTMLElement;
    const instructions = document.querySelector('.instructions') as HTMLElement;
    
    if (statistics && gameArea && instructions) {
        // Check if statistics already exist in game area (to prevent duplicates)
        const existingStats = gameArea.querySelector('[data-fullscreen-cloned="true"]');
        
        // Only clone if there isn't already a clone in the game area
        if (!existingStats) {
            // Clone statistics to preserve event handlers
            const statisticsClone = statistics.cloneNode(true) as HTMLElement;
            statisticsClone.setAttribute('data-fullscreen-cloned', 'true');
            
            // Insert after instructions
            gameArea.insertBefore(statisticsClone, instructions.nextSibling);
            
            // Hide original statistics
            statistics.setAttribute('data-fullscreen-hidden', 'true');
            statistics.style.display = 'none';
        }
    }
    
    // Hide other page elements except game area
    const elementsToHide = [
        document.querySelector('.control-panel'),
        document.querySelector('.game-type-tabs'),
        document.getElementById('newGameBtnBottom'),
        document.getElementById('helpButton')
    ];
    
    elementsToHide.forEach(element => {
        if (element) {
            (element as HTMLElement).setAttribute('data-fullscreen-hidden', 'true');
            (element as HTMLElement).style.display = 'none';
        }
    });
    
    // Create exit button 
    if (!document.getElementById('exitFullscreenButton')) {
        const exitButton = document.createElement('button');
        exitButton.id = 'exitFullscreenButton';
        exitButton.className = 'exit-fullscreen-button';
        exitButton.innerHTML = '<i class="fas fa-times"></i>';
        exitButton.addEventListener('click', exitGameFullscreen);
        document.body.appendChild(exitButton);
    }
}

function exitGameFullscreen() {
    // Remove fullscreen class from body
    document.body.classList.remove('game-fullscreen-mode');
    
    // Restore fullscreen button icon
    const fullscreenButton = document.getElementById('fullscreenButton');
    if (fullscreenButton) {
        fullscreenButton.innerHTML = '<i class="fas fa-expand"></i>';
    }
    
    // Remove cloned statistics from game area
    const clonedStatistics = document.querySelector('[data-fullscreen-cloned="true"]');
    if (clonedStatistics && clonedStatistics.parentNode) {
        clonedStatistics.parentNode.removeChild(clonedStatistics);
    }
    
    // Restore original statistics
    const originalStatistics = document.querySelector('[data-fullscreen-hidden="true"].statistics') as HTMLElement;
    if (originalStatistics) {
        originalStatistics.removeAttribute('data-fullscreen-hidden');
        originalStatistics.style.display = '';
    }
    
    // Restore all other hidden elements
    const hiddenElements = document.querySelectorAll('[data-fullscreen-hidden="true"]');
    hiddenElements.forEach(element => {
        element.removeAttribute('data-fullscreen-hidden');
        (element as HTMLElement).style.display = '';
    });
    
    // Remove exit button
    const exitButton = document.getElementById('exitFullscreenButton');
    if (exitButton) {
        exitButton.parentNode.removeChild(exitButton);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    log('DOMContentLoaded innerWidth= ' + window.innerWidth);
    const originalTestSelect: HTMLSelectElement = document.getElementById('testSelect') as HTMLSelectElement;
    const gameTypeTabs = document.querySelectorAll('.game-type-tab');

    // Set initial game type from active tab
    const activeTab = document.querySelector('.game-type-tab.active') as HTMLElement;
    if (activeTab) {
        const initialGameType = activeTab.getAttribute('data-game-type');
        document.body.setAttribute('data-game-type', initialGameType);
    }

    // Initialize mobile fullscreen mode
    setupFullscreenMode();
    
    // Initialize help button and instructions popover for mobile
    setupMobileInstructions();
    
    // Initialize fullscreen toggle functionality
    setupFullscreenToggle();

    // Add click handlers for game type tabs
    gameTypeTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const previousActiveTab = document.querySelector('.game-type-tab.active') as HTMLElement;
            const previousGameType = previousActiveTab ? previousActiveTab.getAttribute('data-game-type') : null;
            
            // Remove active class from all tabs
            gameTypeTabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Get new game type
            const newGameType = this.getAttribute('data-game-type');
            
            // Set the game type attribute on the body for CSS selection
            document.body.setAttribute('data-game-type', newGameType);
            
            // Hide summary card and show containers
            if (game && typeof game.hideSummaryCardAndShowContainers === 'function') {
                game.hideSummaryCardAndShowContainers();
            }
            
            // Handle pagination visibility based on game type
            const paginationContainer = document.getElementById('paginationContainer');
            if (paginationContainer) {
                if (newGameType === 'fallingWords' || newGameType === 'wordSearch') {
                    paginationContainer.style.display = 'none';
                } else {
                    paginationContainer.style.display = '';
                    paginationContainer.innerHTML = ''; // Clear pagination
                }
            }
            
            // If switching to/from special games, handle their containers
            if (newGameType === 'fallingWords' || previousGameType === 'fallingWords') {
                const fallingWordsContainer = document.querySelector('.falling-words-container');
                if (fallingWordsContainer) {
                    fallingWordsContainer.remove();
                }
            }
            
            // Handle word search grid if switching to/from word search
            if (newGameType === 'wordSearch' || previousGameType === 'wordSearch') {
                const wordSearchGrid = document.querySelector('.word-search-grid');
                if (wordSearchGrid) {
                    wordSearchGrid.remove();
                }
            }
            
            loadSelectedTest();
        });
    });

    // Load speaker state from session storage with default of false
    updateSpeakerIcon();

    document.getElementById('toggleMenuBtn').addEventListener('click', function () {
        const menu = document.getElementById('menu');
        const btnRect = this.getBoundingClientRect(); // Get button's position and dimensions
        menu.style.top = `${btnRect.bottom + 10}px`; // Position menu below the button
        menu.style.left = `${btnRect.left - 5}px`; // Align menu left edge with button left edge
        menu.classList.toggle('active'); // Toggle visibility
        sendEvent('toggleMenu', 'game controls', 'toggle menu', {active: menu.classList.contains('active')});
    });

    const toggleSpeakerBtn = document.getElementById('toggleSpeakerBtn');
    toggleSpeakerBtn.addEventListener('click', function () {
        log('toggleSpeakerBtn clicked speakerEnabled= ' + speakerEnabled);
        speakerEnabled = !speakerEnabled; // Toggle the state
        sessionStorage.setItem('speakersEnabled', speakerEnabled.toString());
        updateSpeakerIcon();
        if (speakerEnabled) {
            VoiceService.getInstance().speak('Hi There', 'en', 1).then(
                () => {
                    log('speak enabled');
                }
            );
        }
    });
    if (new URLSearchParams(window.location.search).has('log')) {
        document.getElementById('log').style.display = 'block';
    }

    document.getElementById('increaseFont').addEventListener('click', () => changeFontSize(1));
    document.getElementById('decreaseFont').addEventListener('click', () => changeFontSize(-1));
    document.getElementById('newGameBtn').addEventListener('click', function() {
        if (typeof Game !== 'undefined' && typeof Game.hideSummaryCardAndShowContainersStatic === 'function') {
            Game.hideSummaryCardAndShowContainersStatic();
        }
        
        // Handle container visibility based on current game type
        const activeTab = document.querySelector('.game-type-tab.active') as HTMLElement;
        const gameType = activeTab ? activeTab.getAttribute('data-game-type') : null;
        
        // Manage pagination visibility based on game type
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) {
            if (gameType === 'fallingWords' || gameType === 'wordSearch') {
                paginationContainer.style.display = 'none';
            } else {
                paginationContainer.style.display = '';
                paginationContainer.innerHTML = ''; // Clear pagination
            }
        }
        
        loadSelectedTest();
    });
    
    document.getElementById('newGameBtnBottom').addEventListener('click', function() {
        if (typeof Game !== 'undefined' && typeof Game.hideSummaryCardAndShowContainersStatic === 'function') {
            Game.hideSummaryCardAndShowContainersStatic();
        }
        
        // Handle container visibility based on current game type
        const activeTab = document.querySelector('.game-type-tab.active') as HTMLElement;
        const gameType = activeTab ? activeTab.getAttribute('data-game-type') : null;
        
        // Manage pagination visibility based on game type
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) {
            if (gameType === 'fallingWords' || gameType === 'wordSearch') {
                paginationContainer.style.display = 'none';
            } else {
                paginationContainer.style.display = '';
                paginationContainer.innerHTML = ''; // Clear pagination
            }
        }
        
        loadSelectedTest();
    });
    document.getElementById('closeSettings').addEventListener('click', closeSettings);

    // Populate both dropdowns
    populateTestSelect(originalTestSelect, function () {
        // Add change event to original select
        originalTestSelect.addEventListener('change', function() {
            // Hide summary card and show containers
            if (game && typeof game.hideSummaryCardAndShowContainers === 'function') {
                game.hideSummaryCardAndShowContainers();
            }
            
            // Reset pagination for test change
            const paginationContainer = document.getElementById('paginationContainer');
            if (paginationContainer) {
                paginationContainer.innerHTML = '';
            }
            
            loadSelectedTest();
        });

        initSelectsByURL()

        // Remove mobile popup - load directly even on mobile
        loadSelectedTest();
    });

    // Add hamburger menu for mobile
    setupMobileMenu();
    
    // Initialize sidebar elements when the document is ready
    const sidebarTestSelect = document.getElementById('testSelectSidebar') as HTMLSelectElement;
    
    // Copy test options to sidebar select
    if (originalTestSelect && sidebarTestSelect) {
        // Watch for changes to the original select and mirror them to the sidebar
        const observer = new MutationObserver(function() {
            sidebarTestSelect.innerHTML = originalTestSelect.innerHTML;
            sidebarTestSelect.value = originalTestSelect.value;
        });
        
        observer.observe(originalTestSelect, { childList: true });
        
        // Also sync any immediate value
        if (originalTestSelect.options.length > 0) {
            sidebarTestSelect.innerHTML = originalTestSelect.innerHTML;
            sidebarTestSelect.value = originalTestSelect.value;
        }
        
        // Handle change on sidebar select
        sidebarTestSelect.addEventListener('change', function(this: HTMLSelectElement) {
            originalTestSelect.value = this.value;
            // Trigger change event on the original
            const event = new Event('change');
            originalTestSelect.dispatchEvent(event);
        });
    }
    
    // Copy voice options to sidebar select
    const originalVoiceSelect = document.getElementById('voiceSelect') as HTMLSelectElement;
    const sidebarVoiceSelect = document.getElementById('voiceSelectSidebar') as HTMLSelectElement;
    
    if (originalVoiceSelect && sidebarVoiceSelect) {
        // Watch for changes to the original voice select
        const observer = new MutationObserver(function() {
            sidebarVoiceSelect.innerHTML = originalVoiceSelect.innerHTML;
            sidebarVoiceSelect.value = originalVoiceSelect.value;
        });
        
        observer.observe(originalVoiceSelect, { childList: true });
        
        // Also sync any immediate value
        if (originalVoiceSelect.options.length > 0) {
            sidebarVoiceSelect.innerHTML = originalVoiceSelect.innerHTML;
            sidebarVoiceSelect.value = originalVoiceSelect.value;
        }
        
        // Handle change on sidebar voice select
        sidebarVoiceSelect.addEventListener('change', function(this: HTMLSelectElement) {
            originalVoiceSelect.value = this.value;
            // Trigger change event on the original
            const event = new Event('change');
            originalVoiceSelect.dispatchEvent(event);
        });
    }
    
    // New font size slider implementation
    const fontSizeSlider = document.getElementById('fontSizeSlider') as HTMLInputElement;
    const restoreDefaultSettings = document.getElementById('restoreDefaultSettings');
    
    if (fontSizeSlider) {
        // Initialize slider with current font size
        const currentFontSize = getComputedFontSize();
        fontSizeSlider.value = currentFontSize.toString();
        
        // Add event listener for slider changes
        fontSizeSlider.addEventListener('input', function() {
            applyFontSize(parseInt(this.value));
        });
        
        // Add event listener for slider change end (to save setting)
        fontSizeSlider.addEventListener('change', function() {
            saveFontSizeToLocal(`${this.value}px`);
        });
    }
    
    if (restoreDefaultSettings) {
        restoreDefaultSettings.addEventListener('click', function() {
            // Reset all settings to defaults
            
            // 1. Reset font size to default (16px)
            const defaultSize = 16;
            applyFontSize(defaultSize);
            if (fontSizeSlider) {
                fontSizeSlider.value = defaultSize.toString();
            }
            saveFontSizeToLocal(`${defaultSize}px`);
            
            // 2. Reset voice selection to default
            if (originalVoiceSelect) {
                originalVoiceSelect.selectedIndex = 0;
                if (sidebarVoiceSelect) {
                    sidebarVoiceSelect.selectedIndex = 0;
                }
                
                // Clear voice preferences from localStorage
                const testSelect = document.getElementById('testSelect') as HTMLSelectElement;
                if (testSelect && testSelect.selectedOptions.length > 0) {
                    const selectedOption = testSelect.selectedOptions[0];
                    const language = selectedOption.dataset.lang;
                    if (language) {
                        localStorage.removeItem(`selectedVoice__${language}`);
                    }
                }
                
                // Trigger change event
                const event = new Event('change');
                originalVoiceSelect.dispatchEvent(event);
            }
            
            // 3. Reset speaker state to default (disabled)
            speakerEnabled = false;
            sessionStorage.setItem('speakersEnabled', speakerEnabled.toString());
            updateSpeakerIcon();
            
            // 4. Show confirmation message
            const statusMessage = document.getElementById('statusMessage');
            if (statusMessage) {
                statusMessage.textContent = 'כל ההגדרות שוחזרו להגדרות ברירת המחדל';
                statusMessage.classList.add('show');
                setTimeout(() => {
                    statusMessage.classList.remove('show');
                }, 3000);
            }
        });
    }
    
    // Helper function to get computed font size
    function getComputedFontSize() {
        const words = document.querySelectorAll<HTMLElement>('.word, .translation');
        if (words.length > 0) {
            // Get computed font size from first word
            const computedSize = parseInt(window.getComputedStyle(words[0], null).getPropertyValue('font-size'), 10);
            return computedSize;
        }
        // Default size if no words found
        return 16;
    }
    
    // Helper function to apply font size
    function applyFontSize(size: number) {
        const words = document.querySelectorAll<HTMLElement>('.word, .translation');
        const newSizeWithUnit = `${size}px`;
        
        // Update individual elements
        words.forEach(word => {
            word.style.fontSize = newSizeWithUnit;
        });
        
        // Update or create the style element for consistent sizing
        let fontSizeStyle = document.getElementById('dynamic-font-size');
        if (!fontSizeStyle) {
            fontSizeStyle = document.createElement('style');
            fontSizeStyle.id = 'dynamic-font-size';
            document.head.appendChild(fontSizeStyle);
        }
        
        // Update the style to apply to all .word and .translation elements, including future ones
        fontSizeStyle.textContent = `
            .word, .translation {
                font-size: ${newSizeWithUnit} !important;
            }
        `;
    }
    
    // Speaker toggle button
    const toggleSpeakerBtnSidebar = document.getElementById('toggleSpeakerBtnSidebar');
    const originalToggleSpeakerBtn = document.getElementById('toggleSpeakerBtn');
    
    if (toggleSpeakerBtnSidebar && originalToggleSpeakerBtn) {
        toggleSpeakerBtnSidebar.addEventListener('click', function() {
            originalToggleSpeakerBtn.click();
            // Update icon to match original
            const originalIcon = originalToggleSpeakerBtn.querySelector('i');
            const sidebarIcon = toggleSpeakerBtnSidebar.querySelector('i');
            if (originalIcon && sidebarIcon) {
                sidebarIcon.className = originalIcon.className;
            }
        });
    }
});

function setupMobileMenu() {
    // Get game switcher button that's already in the control panel
    const gameSwitcherButton = document.getElementById('gameSwitcher');
    
    // Create mobile tabs container
    const mobileTabsContainer = document.createElement('div');
    mobileTabsContainer.className = 'mobile-tabs-container';
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'mobile-tabs-close';
    closeButton.innerHTML = '<i class="fas fa-times"></i>';
    mobileTabsContainer.appendChild(closeButton);
    
    // Create content container
    const tabsContent = document.createElement('div');
    tabsContent.className = 'mobile-tabs-content';
    mobileTabsContainer.appendChild(tabsContent);
    
    // Add to DOM
    document.body.appendChild(mobileTabsContainer);
    
    // Copy tabs to mobile menu
    function updateMobileTabs() {
        tabsContent.innerHTML = '';
        const desktopTabs = document.querySelectorAll('.game-type-tab');
        
        desktopTabs.forEach(tab => {
            const gameType = tab.getAttribute('data-game-type');
            const tabText = tab.textContent;
            const tabIcon = tab.querySelector('i')?.className || '';
            
            const mobileTab = document.createElement('button');
            mobileTab.className = 'mobile-tab-button';
            if (tab.classList.contains('active')) {
                mobileTab.classList.add('active');
            }
            
            mobileTab.setAttribute('data-game-type', gameType);
            mobileTab.innerHTML = tabIcon ? `<i class="${tabIcon}"></i> ${tabText}` : tabText;
            
            mobileTab.addEventListener('click', () => {
                // Update active state in both desktop and mobile
                desktopTabs.forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.mobile-tab-button').forEach(t => t.classList.remove('active'));
                
                tab.classList.add('active');
                mobileTab.classList.add('active');
                
                // Hide mobile menu
                mobileTabsContainer.style.display = 'none';
                
                // Load the selected game
                loadSelectedTest();
            });
            
            tabsContent.appendChild(mobileTab);
        });
    }
    
    // Event listeners
    gameSwitcherButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent the document click from immediately closing it
        updateMobileTabs();
        mobileTabsContainer.style.display = 'flex';
    });
    
    closeButton.addEventListener('click', () => {
        mobileTabsContainer.style.display = 'none';
    });
    
    // Close menu when clicking anywhere on the document
    document.addEventListener('click', (e) => {
        // Don't close if clicking inside the mobile tabs content
        if (e.target && mobileTabsContainer.style.display === 'flex' && 
            !tabsContent.contains(e.target as Node) && 
            !gameSwitcherButton.contains(e.target as Node)) {
            mobileTabsContainer.style.display = 'none';
        }
    });
    
    // Update mobile tabs when desktop tabs change
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                updateMobileTabs();
            }
        });
    });
    
    document.querySelectorAll('.game-type-tab').forEach(tab => {
        observer.observe(tab, { attributes: true });
    });
}

// Setup mobile instructions popover
function setupMobileInstructions() {
    const helpButton = document.getElementById('helpButton');
    const instructionsOverlay = document.getElementById('instructionsOverlay');
    const instructionsPopover = document.getElementById('instructionsPopover');
    const instructionsCloseButton = document.getElementById('instructionsCloseButton');
    const instructionsContent = document.getElementById('instructionsContent');
    
    // When help button is clicked, show the instructions popover
    helpButton.addEventListener('click', function() {
        // Copy content from instructions div to the popover
        const instructionsDiv = document.querySelector('.instructions');
        if (instructionsDiv) {
            instructionsContent.innerHTML = instructionsDiv.innerHTML;
        } else {
            instructionsContent.innerHTML = '<p>לא נמצאו הוראות למשחק זה.</p>';
        }
        
        // Show overlay and popover
        instructionsOverlay.classList.add('active');
        instructionsPopover.classList.add('active');
        
        sendEvent('helpButton', 'game controls', 'show instructions', {});
    });
    
    // Close button and overlay click handler
    instructionsCloseButton.addEventListener('click', closeInstructionsPopover);
    instructionsOverlay.addEventListener('click', closeInstructionsPopover);
    
    function closeInstructionsPopover() {
        instructionsOverlay.classList.remove('active');
        instructionsPopover.classList.remove('active');
    }
}

function setupFullscreenMode() {
    // Check if we're on mobile and enable fullscreen mode automatically
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        document.body.classList.add('fullscreen-mode');
    }
    
    // Update fullscreen mode on resize
    window.addEventListener('resize', () => {
        const shouldBeFullscreen = window.innerWidth <= 768;
        if (shouldBeFullscreen && !document.body.classList.contains('fullscreen-mode')) {
            document.body.classList.add('fullscreen-mode');
        } else if (!shouldBeFullscreen && document.body.classList.contains('fullscreen-mode')) {
            document.body.classList.remove('fullscreen-mode');
        }
    });
    
    // Show controls on initial touch (for better UX)
    let initialTouchOccurred = false;
    
    document.addEventListener('touchstart', () => {
        if (!initialTouchOccurred && document.body.classList.contains('fullscreen-mode')) {
            initialTouchOccurred = true;
            
            // Auto-hide after a few seconds
            setTimeout(() => {
                // No longer needed
            }, 3000);
        }
    }, { once: true });
}

// Function to clear any existing game containers
function clearGameContainers() {
    // Clear falling words container if it exists
    const fallingWordsContainer = document.querySelector('.falling-words-container');
    if (fallingWordsContainer) {
        fallingWordsContainer.remove();
    }
    
    // Clear word search grid if it exists
    const wordSearchGrid = document.querySelector('.word-search-grid');
    if (wordSearchGrid) {
        wordSearchGrid.remove();
    }
    
    // Clear word container
    const wordContainer = document.getElementById('wordContainer');
    if (wordContainer) {
        wordContainer.innerHTML = '';
    }
    
    // Clear target container
    const targetContainer = document.getElementById('targetContainer');
    if (targetContainer) {
        targetContainer.innerHTML = '';
    }
}
