const list = [
    {
        user: "64cdd390-6bb7-4a8b-b0e0-b52294368613",
        scriptUrl: "2024-nov-en-1.js",
        name: "אנגלית 11-2024 חלק 1",
        lang: 'en',
    },
    {
        user: "64cdd390-6bb7-4a8b-b0e0-b52294368613",
        scriptUrl: "2024-nov-en-2.js",
        name: "אנגלית 11-2024 חלק 2",
        lang: 'en',
    },
    {
        user: "64cdd390-6bb7-4a8b-b0e0-b52294368613",
        scriptUrl: "2024-nov-en-3.js",
        name: "אנגלית 11-2024 חלק 3",
        lang: 'en',
    },
    {
        user: "64cdd390-6bb7-4a8b-b0e0-b52294368613",
        scriptUrl: "2024-oct-fr.js",
        name: "צרפתית 10-2024",
        lang: 'fr',
    },
    {
        user: "396e2356-46d8-4dc3-a24b-7d006759a225",
        scriptUrl: "/animals.js",
        name: "חיות",
        lang: 'en',
    },
    {
        user: "396e2356-46d8-4dc3-a24b-7d006759a225",
        scriptUrl: "/feelings.js",
        name: "רגשות",
        lang: 'en',
    },
    {
        user: "396e2356-46d8-4dc3-a24b-7d006759a225",
        scriptUrl: "/harry_potter.js",
        name: "הארי פוטר",
        lang: 'en',
    }
];


let score = 0;
let failures = 0;
let hasEnabledVoice = false;
let speakTimeout;
let startTime, endTime;
let draggedElement = null;
let draggedElementOriginal = null;
let draggedWord = null;
let testWord = "hello";

function getGuid() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('guid'); // Assume 'guid' is the query string parameter
}

function populateTestSelect(selectElement) {
    const guid = getGuid() ?? "64cdd390-6bb7-4a8b-b0e0-b52294368613";
    list.filter(item => {
        return item.user === guid
    })
        .forEach(item => {
            let option = document.createElement('option');
            option.value = `./${guid}/${item.scriptUrl}`;
            log(option.value);
            option.textContent = item.name;
            option.dataset.lang = item.lang;
            selectElement.appendChild(option);
        });
}

function initSelects() {
    const urlParams = new URLSearchParams(window.location.search);
    const testSelectValue = urlParams.get('test');
    const gameTypeSelectValue = urlParams.get('gameType');

    if (testSelectValue) {
        document.getElementById('testSelect').selectedIndex = testSelectValue;
    }
    if (gameTypeSelectValue) {
        document.getElementById('gameTypeSelect').selectedIndex = gameTypeSelectValue;
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function updateUrlParam(key, value) {

    const url = new URL(window.location);
    url.searchParams.set(key, value);
    window.history.pushState({}, '', url);
}

function log(msg) {
    console.log(msg);
    // const logElement = document.getElementById('log');
    // const p = document.createElement('p');
    // p.textContent = msg;
    // logElement.insertBefore(p, logElement.firstChild);
}


function loadSelectedTest() {
    const testSelect = document.getElementById('testSelect');
    const gameTypeSelect = document.getElementById('gameTypeSelect');
    sendEvent('loadSelectedTest', 'game controls', 'start new game', {
        game: testSelect.value,
        type: gameTypeSelect.value
    });
    setTimeout(() => {

        loadVoices(testSelect.options[testSelect.selectedIndex].dataset.lang);
        loadWords(testSelect.options[testSelect.selectedIndex].dataset.lang);
        if (gameTypeSelect.value === 'translation') {

            document.querySelector('.instructions').textContent = 'יש לגרור כל מילה אל התרגום שלה.';
        } else {

            document.querySelector('.instructions').textContent = 'יש לגרור כל מילה לחלק המשפט המתאים.';
        }
        updateUrlParam('test', testSelect.selectedIndex);
        updateUrlParam('gameType', gameTypeSelect.selectedIndex);


    }, 500);

}

function saveSelectedVoice() {
    log('saveSelectedVoice ' + this.value);

    // speak the testWord
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
        const voiceConfigs = languages[language]?.voices;

        const voices = speechSynthesis.getVoices().filter(v => {

            const valid = v.lang.startsWith(`${language}-`);
            //&& languages[language].voices.map(x => x.name).includes(v.name);
            if (!valid) {
                log('checkVoices voice: ' + v.name + ' ' + v.lang + ' ' + valid);
            }
            return valid;
        });


        if (voices.length > 0 || attempts >= maxAttempts) {
            sendEvent('loadVoices', 'game controls', 'load voices', {language: language, voices: voices.length});

            testWord = languages[language].test_word;
            log('checkVoices voices: ' + voices.length);
            voices.forEach(voice => {
                // const voiceConfig = voiceConfigs.find(vc => vc.name === voice.name && vc.language === voice.lang);
                let option = document.createElement('option');
                option.textContent = /*voiceConfig.label || */`${voice.name} (${voice.lang})`; // Fallback to name and language if label is missing
                option.value = voice.name;
                voiceSelect.appendChild(option);
            });
            loadVoiceSettings(language);
        } else {
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
        for (let option of voiceSelect.options) {
            if (option.value === savedVoiceName) {
                log('savedVoiceName found loadVoiceSettings option.index: ' + option.index);
                voiceSelect.selectedIndex = option.index;
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
    saveFontSizeToLocal(words[0].style.fontSize);
    sendEvent('changeFontSize', 'game controls', 'change font size', {change: change, size: words[0].style.fontSize});
}

function saveFontSizeToLocal(fontSize) {
    localStorage.setItem('fontSize', fontSize);
}

function loadFontSize() {
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
        const words = document.querySelectorAll('.word, .translation');
        words.forEach(word => {
            word.style.fontSize = savedFontSize;
        });
    }
}

function loadWords(language) {
    log('loadWords ' + language);
    const select = document.getElementById('testSelect');
    const scriptUrl = select.value;
    const existingScript = document.querySelector('script[data-source="dynamic-words"]');
    if (existingScript) document.body.removeChild(existingScript);
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.setAttribute('data-source', 'dynamic-words');
    document.body.appendChild(script);
    script.onload = () => initializeGame(language);
}

function sortTranslations(words) {
    return words.sort((a, b) => a.translation.localeCompare(b.translation, 'he'));
}

function loadTranslations(translationContainer) {
    const sortedTranslations = sortTranslations([...words]);


    sortedTranslations.forEach(word => {
        const translationDiv = createTranslationDiv(word);
        translationContainer.appendChild(translationDiv);
    });
}

function initializeGame(language) {
    log('initializeGame ' + language);
    if (!words || !Array.isArray(words)) return;
    const wordContainer = document.getElementById('wordContainer');
    const translationContainer = document.getElementById('targetContainer');
    wordContainer.innerHTML = '';
    translationContainer.innerHTML = '';
    updateScore(0);
    updateFailures(0);  // Ensure this is defined and used correctly as per below

    const shuffledWords = shuffleArray([...words]);
    shuffledWords.forEach(word => {
        const wordDiv = createWordDiv(word, language);
        wordContainer.appendChild(wordDiv);
    });
    const gameType = document.getElementById('gameTypeSelect').value;
    if (gameType === 'translation') {
        loadTranslations(translationContainer);
    } else {
        loadPartsOfSpeech();
    }


    loadFontSize()
}

function handleAnswer(targetEl, isCorrect, wordElement) {

    const gameType = document.getElementById('gameTypeSelect').value;


    log('handleAnswer ' + targetEl.textContent + ' ' + wordElement.textContent + ' ' + isCorrect);
    const blinkClass = isCorrect ? 'blink-correct' : 'blink-incorrect';

    sendEvent('handleAnswer', 'game controls', 'answer', {
        target: targetEl.textContent,
        word: wordElement.textContent,
        correct: isCorrect
    });
    targetEl.classList.add(blinkClass);
    targetEl.addEventListener('animationend', function onAnimationEnd() {
        targetEl.classList.remove(blinkClass);
        targetEl.removeEventListener('animationend', onAnimationEnd);
        if (isCorrect) {
            if (gameType === 'translation') {
                targetEl.style.transition = 'opacity 0.5s, transform 0.5s';
                targetEl.style.opacity = '0';
                targetEl.style.transform = 'scale(0)';
                targetEl.addEventListener('transitionend', function onTransitionEnd() {
                    targetEl.style.display = 'none';
                    targetEl.removeEventListener('transitionend', onTransitionEnd);
                });
            }
        }
    });


    wordElement.classList.add(blinkClass);
    wordElement.addEventListener('animationend', function onAnimationEnd() {
        wordElement.classList.remove(blinkClass);
        wordElement.removeEventListener('animationend', onAnimationEnd);
        if (isCorrect) {
            wordElement.style.transition = 'opacity 0.5s, transform 0.5s';
            wordElement.style.opacity = '0';
            wordElement.style.transform = 'scale(0)';
            wordElement.addEventListener('transitionend', function onTransitionEnd() {
                wordElement.style.display = 'none';
                wordElement.removeEventListener('transitionend', onTransitionEnd);
            });
        }
    });

    // Update the game score and failure count
    if (isCorrect) {
        updateScore(score + 1);
    } else {
        updateFailures(failures + 1);
    }
}

function updateFailures(newVal) {
    log('updateFailures ' + newVal);
    failures = newVal;
    document.getElementById('numFailures').textContent = newVal;
}

function createWordDiv(word, language) {
    const wordDiv = document.createElement('div');
    wordDiv.className = 'word';
    wordDiv.textContent = word.text;
    wordDiv.draggable = true;
    wordDiv.addEventListener('dragstart', (event) => handleDragStart(event, language));
    wordDiv.addEventListener('dragend', handleDragEnd); // Add this line

    wordDiv.addEventListener('touchstart', (event) => handleTouchStart(event, language));
    document.addEventListener('touchcancel', handleTouchCancel, {passive: false});
    wordDiv.addEventListener('touchmove', handleTouchMove);
    wordDiv.addEventListener('touchend', handleTouchEnd);

    wordDiv.addEventListener('mouseenter', () => handleMouseEnter(wordDiv, language));
    wordDiv.addEventListener('mouseleave', () => clearTimeout(speakTimeout));
    return wordDiv;
}

function createTranslationDiv(word) {
    const targetDiv = document.createElement('div');
    targetDiv.className = 'translation';
    targetDiv.textContent = word.translation;
    targetDiv.addEventListener('dragover', handleDragOver);
    targetDiv.addEventListener('dragleave', handleDragLeave);
    targetDiv.addEventListener('drop', handleDrop);

    return targetDiv;
}


function handleMouseEnter(wordDiv, language) {
    log('handleMouseEnter ' + wordDiv.textContent + ' ' + language + ' ' + hasEnabledVoice);

}


function handleTouchStart(event, language) {
    event.preventDefault();
    draggedElementOriginal = event.target;
    draggedElement = event.target.cloneNode(true);
    document.body.appendChild(draggedElement);
    draggedElement.style.position = 'fixed';
    draggedElement.style.zIndex = '1000';
    draggedElement.style.border = '2px dashed red'; // Optional: add a dashed border
    draggedElement.style.opacity = '0.5'; // Optional: make the clone semi-transparent
    handleTouchMove(event); // Update position immediately
    event.target.classList.add('dragging'); // Indicate original element is being dragged

    speakTimeout = setTimeout(() => {
        const voiceSelect = document.getElementById('voiceSelect');
        const selectedVoice = voiceSelect.value;
        const utterance = new SpeechSynthesisUtterance(draggedElement.textContent);
        utterance.voice = speechSynthesis.getVoices().find(voice => voice.name === selectedVoice);
        utterance.lang = language;

        log(' handleMouseEnter speak: ' + utterance.lang + ' ' + utterance.voice.name + ' ' + draggedElement.textContent);
        speechSynthesis.speak(utterance);
    }, 500);
}

function handleTouchCancel(event) {
    log('handleTouchCancel');
    event.preventDefault();
    if (!draggedElement) return;
    document.body.removeChild(draggedElement); // Remove the cloned element
    resetDraggedElement();

}

function handleTouchMove(event) {
    if (!draggedElement) return;
    const touch = event.touches[0];
    draggedElement.style.left = `${touch.clientX - (draggedElement.offsetWidth / 2)}px`;
    draggedElement.style.top = `${touch.clientY - (draggedElement.offsetHeight / 2)}px`;
}

function handleTouchEnd(event) {
    event.preventDefault();
    if (!draggedElement) return;


    draggedElement.style.display = 'none';

    const touch = event.changedTouches[0];
    let dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);

    // Re-display the dragged element
    draggedElement.style.display = 'block';

    // Navigate up the DOM tree to find the drop target with 'translation' class if not directly hit
    while (dropTarget && dropTarget.classList && !dropTarget.classList.contains('translation') && dropTarget.parentNode) {
        dropTarget = dropTarget.parentNode;
    }

    if (!dropTarget) {
        log('handleTouchEnd no dropTarget');
        document.body.removeChild(draggedElement); // Remove the cloned element
        resetDraggedElement(); // Reset styles and cleanup
        return;
    }


    if (dropTarget && dropTarget.classList && dropTarget.classList.contains('translation')) {

        const isCorrect = checkCorrectness(dropTarget);
        // words.some(word =>
        //     word.text === draggedElement.textContent &&
        //     word.translation === dropTarget.textContent
        // );
        handleAnswer(dropTarget, isCorrect, draggedElementOriginal);
    }

    document.body.removeChild(draggedElement); // Remove the cloned element
    resetDraggedElement(); // Reset styles and cleanup
}

function checkCorrectness(dropTarget) {
    const gameType = document.getElementById('gameTypeSelect').value;
    log(`Checking correctness: Dragged [${draggedElement.textContent}], Target [${dropTarget.textContent}], Game Type [${gameType}]`);

    if (gameType === 'translation') {
        const isMatch = words.some(word => word.text === draggedElement.textContent && word.translation === dropTarget.textContent);
        log(`Translation match: ${isMatch}`);
        return isMatch;
    } else if (gameType === 'partOfSpeech') {
        const isMatch = words.some(word => word.text === draggedElement.textContent && word.partOfSpeech === dropTarget.textContent);
        log(`Part of speech match: ${isMatch}`);
        return isMatch;
    }

    log('Invalid game type or no match found');
    return false;
}

function resetDraggedElement() {

    log('resetDraggedElement');
    document.querySelectorAll('.dragging').forEach(el => {
        el.classList.remove('dragging');
    });


}

function handleDragStart(event, language) {
    log('dragStart ' + event.target.textContent);
    draggedElement = event.target;
    draggedWord = event.target.textContent;
    event.dataTransfer.setData("text", event.target.textContent);
    document.querySelectorAll('.word').forEach(wordDiv => {
        wordDiv.classList.remove('dragging');
    });
    draggedElement.classList.add('dragging');

    if (!hasEnabledVoice) {
        const lecture = new SpeechSynthesisUtterance('hello');
        lecture.volume = 0;
        speechSynthesis.speak(lecture);
        hasEnabledVoice = true;
    }
    speakTimeout = setTimeout(() => {
        const voiceSelect = document.getElementById('voiceSelect');
        const selectedVoice = voiceSelect.value;
        const utterance = new SpeechSynthesisUtterance(draggedWord);
        utterance.voice = speechSynthesis.getVoices().find(voice => voice.name === selectedVoice);
        utterance.lang = language;
        log(' handleDragStart speak: ' + utterance.lang + ' ' + utterance.voice.name + ' ' + draggedWord);
        speechSynthesis.speak(utterance);
    }, 500);
}

function handleDragEnd(event) {
    log('dragEnd');
    if (draggedElement) {
        resetDraggedElement();
    }
}

function handleDragOver(event) {
    log('dragOver');
    event.preventDefault();
    if (event.target.classList.contains('translation')) {
        event.target.classList.add('highlight');
    }
}

function handleDragLeave(event) {
    log('dragLeave');
    if (event.target.classList.contains('highlight')) {
        event.target.classList.remove('highlight');
    }

    document.querySelectorAll('.dragging').forEach(el => {
        el.classList.remove('dragging');
    });
}

function handleDrop(event) {
    log('handleDrop');
    event.preventDefault();
    if (!draggedElement) return;

    if (event.target.classList.contains('translation')) {
        event.target.classList.remove('highlight');
    }

    const dropTarget = event.target;

    if (dropTarget.classList.contains('translation')) {
        const isCorrect = checkCorrectness(dropTarget);
        handleAnswer(dropTarget, isCorrect, draggedElement);


    }
    resetDraggedElement();
}

function showMessage(isCorrect) {

    // const messageDiv = document.getElementById('statusMessage');
    // messageDiv.style.display = 'block';
    // messageDiv.textContent = isCorrect ? "כל הכבוד!" : "נסה שוב!";
    // setTimeout(() => { messageDiv.style.display = 'none'; }, 3000);
}

function updateScore(newScore) {
    log('updateScore ' + newScore);
    score = newScore;
    document.getElementById('scoreDisplay').textContent = `${score}`;

    if (score === words.length) {
        // endTime = new Date(); // End time when game finishes
        //  const duration = (endTime - startTime) / 1000; // Calculate duration in seconds
        const statusMessage = document.getElementById('statusMessage');
        statusMessage.textContent = "המשחק הסתיים בהצלחה!"; // Set message text
        sendEvent('updateScore', 'game controls', 'game over', {score: score, failures: failures});
        statusMessage.classList.add('show');

        // Use setTimeout to allow the browser to redraw, then re-add the show class
        setTimeout(() => {
            statusMessage.classList.remove('show');
        }, 4000); // Short delay
        showConfetti();
    }
}

function showConfetti() {
    const confettiCount = 100;
    const confettiElement = document.createElement('div');
    document.body.appendChild(confettiElement);
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        confetti.style.animationDuration = `${Math.random() * 2 + 1}s`;
        confetti.style.opacity = Math.random();
        confetti.style.top = `${-Math.random() * 20}px`;
        confettiElement.appendChild(confetti);
    }
    setTimeout(() => {
        confettiElement.remove();
    }, 3000);
}

function loadPartsOfSpeech() {
    // Populate partOfSpeechContainer with all parts of speech
    const partOfSpeechContainer = document.getElementById('targetContainer');
    partOfSpeechContainer.innerHTML = ''; // Clear previous content
    const partsOfSpeech = new Set(words.map(m => m.partOfSpeech));
    partsOfSpeech.forEach(part => {
        const targetDiv = document.createElement('div');
        targetDiv.textContent = part;
        targetDiv.className = 'translation';
        targetDiv.addEventListener('dragover', handleDragOver);
        targetDiv.addEventListener('dragleave', handleDragLeave);
        targetDiv.addEventListener('drop', handleDrop);
        partOfSpeechContainer.appendChild(targetDiv);
    });
}

function closeSettings() {
    document.getElementById('menu').classList.remove('active');
}

document.getElementById('toggleMenuBtn').addEventListener('click', function () {
    const menu = document.getElementById('menu');
    menu.classList.toggle('active'); // This toggles the visibility and position of the menu
    sendEvent('toggleMenu', 'game controls', 'toggle menu', {active: menu.classList.contains('active')});
});

document.body.addEventListener('click', () => {
    const lecture = new SpeechSynthesisUtterance('hello');
    lecture.volume = 0;
    speechSynthesis.speak(lecture);
    hasEnabledVoice = true;
}, {once: true});


document.addEventListener('DOMContentLoaded', function () {
    log('DOMContentLoaded innerWidth= ' + window.innerWidth);
    const originalTestSelect = document.getElementById('testSelect');
    const gameTypeSelect = document.getElementById('gameTypeSelect');
    // Populate both dropdowns
    populateTestSelect(originalTestSelect);

    // Add change event to original select
    originalTestSelect.addEventListener('change', loadSelectedTest);
    gameTypeSelect.addEventListener('change', loadSelectedTest);

    initSelects()

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
    } else {

        loadSelectedTest();
    }

});
