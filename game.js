const list = [

    {
        scriptUrl: "./maya/english/11-2024/words2.js",
        name: "אנגלית נובמבר 2024 חלק 2",
        lang: 'en-US',
    },
    {
        scriptUrl: "./maya/english/11-2024/words.js",
        name: "אנגלית נובמבר 2024 חלק 1",
        lang: 'en-US',
    },
    {
        scriptUrl: "./maya/french/10-2024/words.js",
        name: "צרפתית אוקטובר 2024",
        lang: 'fr-FR',
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

document.body.addEventListener('click', () => {
    const lecture = new SpeechSynthesisUtterance('hello');
    lecture.volume = 0;
    speechSynthesis.speak(lecture);
    hasEnabledVoice = true;
}, {once: true});


document.addEventListener('DOMContentLoaded', function () {
    log('DOMContentLoaded innerWidth= ' + window.innerWidth);
    const originalTestSelect = document.getElementById('testSelect');

    // Populate both dropdowns
    populateTestSelect(originalTestSelect);

    // Add change event to original select
    originalTestSelect.addEventListener('change', loadSelectedTest);

    if (window.innerWidth <= 1200) {
        const overlay = document.getElementById("overlay");
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

function populateTestSelect(selectElement) {
    list.forEach(item => {
        let option = document.createElement('option');
        option.value = item.scriptUrl;
        option.textContent = item.name;
        option.dataset.lang = item.lang;
        selectElement.appendChild(option);
    });
}


function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


function log(msg) {
    console.log(msg);
    // const logElement = document.getElementById('log');
    // const p = document.createElement('p');
    // p.textContent = msg;
    // logElement.insertBefore(p, logElement.firstChild);
}


function loadSelectedTest() {
    const select = document.getElementById('testSelect');
    setTimeout(() => {
        loadVoices(select.options[select.selectedIndex].dataset.lang);
        loadWords(select.options[select.selectedIndex].dataset.lang);
    }, 500);

}

function loadVoices(language) {
    log('loadVoices ' + language);
    const voiceSelect = document.getElementById('voiceSelect');
    voiceSelect.innerHTML = '';
    let attempts = 0, maxAttempts = 50;
    voiceSelect.removeEventListener('change', saveSelectedVoice);
    voiceSelect.addEventListener('change', saveSelectedVoice);

    function saveSelectedVoice() {
        log('saveSelectedVoice ' + this.value + ' ' + language);
        localStorage.setItem('selectedVoice_' + language, this.value);
    }

    const checkVoices = () => {
        const voices = speechSynthesis.getVoices().filter(voice => voice.lang.startsWith(language));

        if (voices.length > 0 || attempts >= maxAttempts) {
            log('checkVoices voices: ' + voices.length);
            voices.forEach(voice => {
                let option = document.createElement('option');
                option.textContent = `${voice.name} (${voice.lang})`;
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

function initializeGame(language) {
    log('initializeGame ' + language);
    if (!words || !Array.isArray(words)) return;
    const wordContainer = document.getElementById('wordContainer');
    const translationContainer = document.getElementById('translationContainer');
    wordContainer.innerHTML = '';
    translationContainer.innerHTML = '';
    updateScore(0);
    updateFailures(0);  // Ensure this is defined and used correctly as per below

    const shuffledWords = shuffleArray([...words]);
    shuffledWords.forEach(word => {
        const wordDiv = createWordDiv(word, language);
        wordContainer.appendChild(wordDiv);
    });

    const shuffledTranslations = shuffleArray([...words]);
    shuffledTranslations.forEach(word => {
        const translationDiv = createTranslationDiv(word);
        translationContainer.appendChild(translationDiv);
    });
    loadFontSize()
}

function handleAnswer(translationElement, isCorrect, wordElement) {

    log('handleAnswer ' + translationElement.textContent + ' ' + wordElement.textContent + ' ' + isCorrect);
    const blinkClass = isCorrect ? 'blink-correct' : 'blink-incorrect';
    translationElement.classList.add(blinkClass);
    translationElement.addEventListener('animationend', function onAnimationEnd() {
        translationElement.classList.remove(blinkClass);
        translationElement.removeEventListener('animationend', onAnimationEnd);
        if (isCorrect) {
            translationElement.style.transition = 'opacity 0.5s, transform 0.5s';
            translationElement.style.opacity = '0';
            translationElement.style.transform = 'scale(0)';
            translationElement.addEventListener('transitionend', function onTransitionEnd() {
                translationElement.style.display = 'none';
                translationElement.removeEventListener('transitionend', onTransitionEnd);
            });
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
    const translationDiv = document.createElement('div');
    translationDiv.className = 'translation';
    translationDiv.textContent = word.translation;
    translationDiv.addEventListener('dragover', handleDragOver);
    translationDiv.addEventListener('dragleave', handleDragLeave);
    translationDiv.addEventListener('drop', handleDrop);

    return translationDiv;
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
        log(' handleMouseEnter speak: ' + utterance.lang + ' ' + utterance.voice + ' ' + draggedElement.textContent);
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

        const isCorrect = words.some(word =>
            word.text === draggedElement.textContent &&
            word.translation === dropTarget.textContent
        );
        handleAnswer(dropTarget, isCorrect, draggedElementOriginal);
    }

    document.body.removeChild(draggedElement); // Remove the cloned element
    resetDraggedElement(); // Reset styles and cleanup
}

function resetDraggedElement() {
    debugger
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
        log(' handleDragStart speak: ' + utterance.lang + ' ' + utterance.voice + ' ' + draggedWord);
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
        const isCorrect = words.some(word =>
            word.text === draggedWord &&
            word.translation === dropTarget.textContent
        );
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
    document.getElementById('scoreDisplay').textContent = `נקודות: ${score}`;

    if (score === words.length) {
        // endTime = new Date(); // End time when game finishes
        //  const duration = (endTime - startTime) / 1000; // Calculate duration in seconds
        document.getElementById('statusMessage').textContent = "המשחק הסתיים בהצלחה! Duration: ";
        document.getElementById('statusMessage').style.display = 'block';
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