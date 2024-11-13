import {languages} from './voices.js';
import { sendEvent } from './analytics.js';
import {shuffleArray, updateUrlParam} from "./utilities.js";
 
 
 

///////////////////// end ga
let score = 0;
let failures = 0;
let hasEnabledVoice = false;
let speakTimeout: ReturnType<typeof setTimeout> | undefined;
let startTime: Date | undefined, endTime: Date | undefined;
let draggedElement: HTMLElement | null = null;
let draggedElementOriginal: HTMLElement | null = null;
let draggedWord: string | null = null;
let testWord = 'hello';
let words = [];


const GameTypes = {
    TRANSLATION: "translation",
    PART_OF_SPEECH: "partOfSpeech",
    MISSING_WORD: "missingWord"
};


function getGuid(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('guid') || null;
}

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
            window['tests_list'].forEach((item: { scriptUrl: string; name: string; lang: string }) => {
                const option = document.createElement('option');
                option.value = `words/${guid}/${item.scriptUrl}`;
                option.textContent = item.name;
                option.dataset.lang = item.lang;
                selectElement.appendChild(option);
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
    if (gameTypeSelectValue !== null) {
        const gameTypeSelect = document.getElementById('gameTypeSelect') as HTMLSelectElement;
        gameTypeSelect.selectedIndex = parseInt(gameTypeSelectValue, 10);
    }
}



function log(msg) {
    console.log(msg);
    // const logElement = document.getElementById('log');
    // const p = document.createElement('p');
    // p.textContent = msg;
    // logElement.insertBefore(p, logElement.firstChild);
}


function loadSelectedTest() {
    const testSelect = document.getElementById('testSelect') as HTMLSelectElement;
    const gameTypeSelect = document.getElementById('gameTypeSelect') as HTMLSelectElement;
    sendEvent('loadSelectedTest', 'game controls', 'start new game', {
        game: testSelect.value,
        type: gameTypeSelect.value
    });
    setTimeout(() => {
        const selectedOption = testSelect.options[testSelect.selectedIndex];
        loadVoices(selectedOption.dataset.lang!);
        loadWords(selectedOption.dataset.lang!);
        if (gameTypeSelect.value === GameTypes.TRANSLATION) {
            document.querySelector('.instructions')!.textContent = 'יש לגרור כל מילה אל התרגום שלה.';
        } else if (gameTypeSelect.value === GameTypes.PART_OF_SPEECH) {
            document.querySelector('.instructions')!.textContent = 'יש לגרור כל מילה לחלק המשפט המתאים.';
        } else if (gameTypeSelect.value === GameTypes.MISSING_WORD) {
            document.querySelector('.instructions')!.textContent = 'יש לגרור את המילה החסרה במשפט.';
        }
        updateUrlParam('test', testSelect.selectedIndex.toString());
        updateUrlParam('gameType', gameTypeSelect.selectedIndex.toString());
    }, 500);

}

function saveSelectedVoice(this: HTMLSelectElement) {
    log('saveSelectedVoice ' + this.value);

    // Speak the testWord
    speakTimeout = setTimeout(() => {
        const testVoiceMessage = new SpeechSynthesisUtterance(testWord);
        testVoiceMessage.voice = speechSynthesis.getVoices().find(voice => voice.name === this.value)!;
        speechSynthesis.speak(testVoiceMessage);
    }, 500);
}


function loadVoices(language) {
    log('loadVoices ' + language);
    const voiceSelect = document.getElementById('voiceSelect') as HTMLSelectElement;
    voiceSelect.innerHTML = '';
    let attempts = 0, maxAttempts = 50;
    voiceSelect.removeEventListener('change', saveSelectedVoice);
    voiceSelect.addEventListener('change', saveSelectedVoice);
    const checkVoices = () => {
        const voiceConfigs = languages[language]?.voices;

        const voices = speechSynthesis.getVoices().filter(v => {

            const valid = v.lang.startsWith(`${language}-`);
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
                const option = document.createElement('option');
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

function loadVoiceSettings(language: string) {
    log('loadVoiceSettings');
    const savedVoiceName = localStorage.getItem('selectedVoice_' + language);
    const voiceSelect = document.getElementById('voiceSelect') as HTMLSelectElement;
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

function changeFontSize(change: number) {
    const words = document.querySelectorAll<HTMLElement>('.word, .translation');
    words.forEach(word => {
        const currentSize = parseInt(window.getComputedStyle(word, null).getPropertyValue('font-size'), 10);
        const newSize = currentSize + change;
        word.style.fontSize = `${newSize}px`;
    });
    // Save the new font size to local storage
    saveFontSizeToLocal(`${words[0].style.fontSize}`);
    sendEvent('changeFontSize', 'game controls', 'change font size', {change: change, size: words[0].style.fontSize});
}

function saveFontSizeToLocal(fontSize: string) {
    localStorage.setItem('fontSize', fontSize);
}

function loadFontSize() {
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
        const words = document.querySelectorAll<HTMLElement>('.word, .translation');
        words.forEach(word => {
            word.style.fontSize = savedFontSize;
        });
    }
}

function loadWords(language: string) {
    log('loadWords ' + language);
    const select = document.getElementById('testSelect') as HTMLSelectElement;
    const scriptUrl = select.value;
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-source="dynamic-words"]');
    if (existingScript) document.body.removeChild(existingScript);
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.setAttribute('data-source', 'dynamic-words');
    document.body.appendChild(script);
    script.onload = () => {
        // Assuming the loaded script sets a global variable `loadedWords`
        if (window['words']) {
            words = window['words'];
            initializeGame(language);
        } else {
            console.error('Loaded script did not set the words array.');
        }
    };
}

function sortTranslations(words: {
    text: string;
    translation: string;
    partOfSpeech?: string;
    sentences?: { from: string; to: string }[]
}[]) {
    return words.sort((a, b) => a.translation.localeCompare(b.translation, 'he'));
}

function loadTranslations(translationContainer: HTMLElement) {
    const sortedTranslations = sortTranslations([...words]);


    sortedTranslations.forEach(word => {
        const translationDiv = createTranslationDiv(word);
        translationContainer.appendChild(translationDiv);
    });
}

function initializeGame(language: string) {
    log('initializeGame ' + language);
    if (!words || !Array.isArray(words)) return;
    const wordContainer = document.getElementById('wordContainer')!;
    const translationContainer = document.getElementById('targetContainer')!;
    wordContainer.innerHTML = '';
    translationContainer.innerHTML = '';
    updateScore(0);
    updateFailures(0);  // Ensure this is defined and used correctly as per below

    const shuffledWords = shuffleArray([...words]);
    shuffledWords.forEach(word => {
        const wordDiv = createWordDiv(word, language);
        wordContainer.appendChild(wordDiv);
    });
    const gameType = (document.getElementById('gameTypeSelect') as HTMLSelectElement).value as typeof GameTypes[keyof typeof GameTypes];

    if (gameType === GameTypes.TRANSLATION) {
        loadTranslations(translationContainer);
    } else if (gameType === GameTypes.PART_OF_SPEECH) {
        loadPartsOfSpeech();
    } else if (gameType === GameTypes.MISSING_WORD) {
        loadSentences();
    }

    loadFontSize();
}

function handleAnswer(targetEl: HTMLElement, isCorrect: boolean, wordElement: HTMLElement) {
    const gameType = (document.getElementById('gameTypeSelect') as HTMLSelectElement).value as typeof GameTypes[keyof typeof GameTypes];

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
            wordElement.classList.add('correct');
            if (gameType === GameTypes.TRANSLATION) {
                targetEl.style.transition = 'opacity 0.5s, transform 0.5s';
                targetEl.style.opacity = '0';
                targetEl.style.transform = 'scale(0)';
                targetEl.addEventListener('transitionend', function onTransitionEnd() {
                    targetEl.style.display = 'none';
                    targetEl.removeEventListener('transitionend', onTransitionEnd);
                });
            } else if (gameType === GameTypes.MISSING_WORD) {
                loadSentences();
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

function updateFailures(newVal: number) {
    log('updateFailures ' + newVal);
    failures = newVal;
    document.getElementById('numFailures')!.textContent = newVal.toString();
}


function createWordDiv(word: {
    text: string;
    partOfSpeech?: string;
    sentences?: { from: string; to: string }[]
}, language: string) {
    const wordDiv = document.createElement('div');
    wordDiv.className = 'word';
    wordDiv.textContent = word.text;
    wordDiv.draggable = true;
    wordDiv.addEventListener('dragstart', (event) => handleDragStart(event, language));
    wordDiv.addEventListener('dragend', handleDragEnd);

    wordDiv.addEventListener('touchstart', (event) => handleTouchStart(event, language));
    document.addEventListener('touchcancel', handleTouchCancel, {passive: false});
    wordDiv.addEventListener('touchmove', handleTouchMove);
    wordDiv.addEventListener('touchend', handleTouchEnd);

    wordDiv.addEventListener('mouseenter', () => handleMouseEnter(wordDiv, language));
    wordDiv.addEventListener('mouseleave', () => clearTimeout(speakTimeout));
    return wordDiv;
}

function createTranslationDiv(word: {
    text: string;
    translation: string;
    partOfSpeech?: string;
    sentences?: { from: string; to: string }[]
}) {
    const targetDiv = document.createElement('div');
    targetDiv.className = 'translation';
    targetDiv.textContent = word.translation;
    targetDiv.addEventListener('dragover', handleDragOver);
    targetDiv.addEventListener('dragleave', handleDragLeave);
    targetDiv.addEventListener('drop', handleDrop);

    return targetDiv;
}


function handleMouseEnter(wordDiv: HTMLElement, language: string) {
    log('handleMouseEnter ' + wordDiv.textContent + ' ' + language + ' ' + hasEnabledVoice);

}


function handleTouchStart(event: TouchEvent, language: string) {
    event.preventDefault();
    draggedElementOriginal = event.target as HTMLElement;
    draggedElement = draggedElementOriginal.cloneNode(true) as HTMLElement;
    document.body.appendChild(draggedElement);
    draggedElement.style.position = 'fixed';
    draggedElement.style.zIndex = '1000';
    draggedElement.style.border = '2px dashed red'; // Optional: add a dashed border
    draggedElement.style.opacity = '0.5'; // Optional: make the clone semi-transparent
    handleTouchMove(event); // Update position immediately
    draggedElementOriginal.classList.add('dragging'); // Indicate original element is being dragged

    speakTimeout = setTimeout(() => {
        const voiceSelect = document.getElementById('voiceSelect') as HTMLSelectElement;
        const selectedVoice = voiceSelect.value;
        const utterance = new SpeechSynthesisUtterance(draggedElement.textContent);
        utterance.voice = speechSynthesis.getVoices().find(voice => voice.name === selectedVoice);
        utterance.lang = language;

        log(' handleMouseEnter speak: ' + utterance.lang + ' ' + utterance.voice.name + ' ' + draggedElement.textContent);
        speechSynthesis.speak(utterance);
    }, 500);
}

function handleTouchCancel(event: TouchEvent) {
    log('handleTouchCancel');
    event.preventDefault();
    if (!draggedElement) return;
    document.body.removeChild(draggedElement); // Remove the cloned element
    resetDraggedElement();

}

function handleTouchMove(event: TouchEvent) {
    if (!draggedElement) return;
    const touch = event.touches[0];
    draggedElement.style.left = `${touch.clientX - (draggedElement.offsetWidth / 2)}px`;
    draggedElement.style.top = `${touch.clientY - (draggedElement.offsetHeight / 2)}px`;
}

function handleTouchEnd(event: TouchEvent) {
    event.preventDefault();
    if (!draggedElement) return;


    draggedElement.style.display = 'none';

    const touch = event.changedTouches[0];
    let dropTarget = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;


    // Re-display the dragged element
    draggedElement.style.display = 'block';

    // Navigate up the DOM tree to find the drop target with 'translation' class if not directly hit
    while (dropTarget && dropTarget.classList && !dropTarget.classList.contains('translation') && dropTarget.parentNode) {
        dropTarget = dropTarget.parentNode as HTMLElement;
    }

    if (!dropTarget) {
        log('handleTouchEnd no dropTarget');
        document.body.removeChild(draggedElement); // Remove the cloned element
        resetDraggedElement(); // Reset styles and cleanup
        return;
    }


    if (dropTarget && dropTarget.classList && dropTarget.classList.contains('translation')) {

        const isCorrect = checkCorrectness(dropTarget);
        handleAnswer(dropTarget, isCorrect, draggedElementOriginal);
    }

    document.body.removeChild(draggedElement); // Remove the cloned element
    resetDraggedElement(); // Reset styles and cleanup
}

function checkCorrectness(dropTarget: HTMLElement) {
    const gameTypeSelect = document.getElementById('gameTypeSelect') as HTMLSelectElement;

    const gameType = gameTypeSelect.value;
    log(`Checking correctness: Dragged [${draggedElement.textContent}], Target [${dropTarget.textContent}], Game Type [${gameType}]`);

    if (gameType === GameTypes.TRANSLATION) {
        const isMatch = words.some(word => word.text === draggedElement.textContent && word.translation === dropTarget.textContent);
        log(`Translation match: ${isMatch}`);
        return isMatch;
    } else if (gameType === GameTypes.PART_OF_SPEECH) {
        const isMatch = words.some(word => word.text === draggedElement.textContent && word.partOfSpeech === dropTarget.textContent);
        log(`Part of speech match: ${isMatch}`);
        return isMatch;
    } else if (gameType === GameTypes.MISSING_WORD) {
        // Check if the dragged word correctly fills the blank in the target sentence
        const isMatch = draggedElement.textContent === dropTarget.dataset.selectedWord;
        log(`Missing word match: ${isMatch}`);
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

function handleDragStart(event: DragEvent, language: string) {
    draggedElement = event.target as HTMLElement;
    log('dragStart ' + draggedElement.textContent);
    draggedWord = draggedElement.textContent;
    event.dataTransfer.setData("text", draggedElement.textContent);
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
        const voiceSelect = document.getElementById('voiceSelect') as HTMLSelectElement;
        const selectedVoice = voiceSelect.value;
        const utterance = new SpeechSynthesisUtterance(draggedWord);
        utterance.voice = speechSynthesis.getVoices().find(voice => voice.name === selectedVoice);
        utterance.lang = language;
        log(' handleDragStart speak: ' + utterance.lang + ' ' + utterance.voice.name + ' ' + draggedWord);
        speechSynthesis.speak(utterance);
    }, 500);
}

function handleDragEnd(event: DragEvent) {
    log('dragEnd');
    if (draggedElement) {
        resetDraggedElement();
    }
}

function handleDragOver(event: DragEvent) {
    log('dragOver');
    event.preventDefault();
    const target = event.target as HTMLElement;
    if (target.classList.contains('translation')) {
        target.classList.add('highlight');
    }
}

function handleDragLeave(event: DragEvent) {
    log('dragLeave');
    const target = event.target as HTMLElement;
    if (target.classList.contains('highlight')) {
        target.classList.remove('highlight');
    }

    document.querySelectorAll('.dragging').forEach(el => {
        el.classList.remove('dragging');
    });
}

function handleDrop(event: DragEvent) {
    log('handleDrop');
    event.preventDefault();
    if (!draggedElement) return;
    const dropTarget = event.target as HTMLElement;
    if (dropTarget.classList.contains('translation')) {
        dropTarget.classList.remove('highlight');
    }

    ;

    if (dropTarget.classList.contains('translation')) {
        const isCorrect = checkCorrectness(dropTarget);
        handleAnswer(dropTarget, isCorrect, draggedElement);


    }
    resetDraggedElement();
}

function updateScore(newScore: number) {
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
        confetti.style.opacity = Math.random().toString();
        confetti.style.top = `${-Math.random() * 20}px`;
        confettiElement.appendChild(confetti);
    }
    setTimeout(() => {
        confettiElement.remove();
    }, 3000);
}

function loadSentences() {
    const sentenceContainer = document.getElementById('targetContainer');
    sentenceContainer.innerHTML = ''; // Clear previous content
    const randomSentance = getRandomWordAndModifiedSentence();

    const targetDiv = document.createElement('div');
    targetDiv.textContent = randomSentance.modifiedSentence;
    targetDiv.className = 'translation ltr';
    targetDiv.addEventListener('dragover', handleDragOver);
    targetDiv.addEventListener('dragleave', handleDragLeave);
    targetDiv.addEventListener('drop', handleDrop);
    targetDiv.dataset.selectedWord = randomSentance.selectedWord;
    sentenceContainer.appendChild(targetDiv);

}

function getRandomWordAndModifiedSentence() {
    // Select a random word object

    const displayedWords = Array.from(document.querySelectorAll('.word'))
        .filter(element => (element as HTMLElement).offsetParent !== null && !element.classList.contains('correct'))
        .map(element => element.textContent);
    log('displayedWords ' + displayedWords.join(","));
    // Filter the words array to include only those that are displayed
    const filteredWords = words.filter(word => displayedWords.includes(word.text));

    if (filteredWords.length === 0) {
        log('No matching words found on the page.');
        return null;  // or handle this case as needed
    }

    // Select a random word object from the filtered list
    const randomWordIndex = Math.floor(Math.random() * filteredWords.length);
    const selectedWord = filteredWords[randomWordIndex];

    // Select a random sentence from the chosen word object
    const randomSentenceIndex = Math.floor(Math.random() * selectedWord.sentences.length);
    const selectedSentence = selectedWord.sentences[randomSentenceIndex].from;

    // Replace the word in the sentence with underscores
    // Ensure only whole words are replaced
    const modifiedSentence = selectedSentence.replace(new RegExp(`(?<!\\w)${selectedWord.text}(?!\\w)`, 'gi'), "________");

    log('getRandomWordAndModifiedSentence ' + selectedWord.text + ' ' + modifiedSentence + ' ' + selectedSentence);
    return {selectedWord: selectedWord.text, modifiedSentence, selectedSentence};
}

function loadPartsOfSpeech() {
    // Populate partOfSpeechContainer with all parts of speech
    const partOfSpeechContainer = document.getElementById('targetContainer');
    partOfSpeechContainer.innerHTML = ''; // Clear previous content
    const partsOfSpeech = new Set(words.map(m => m.partOfSpeech));
    partsOfSpeech.forEach(part => {
        const targetDiv: HTMLDivElement = document.createElement('div') as HTMLDivElement;
        targetDiv.textContent = part;
        targetDiv.className = 'translation';
        targetDiv.addEventListener('dragover', handleDragOver);
        targetDiv.addEventListener('dragleave', handleDragLeave);
        targetDiv.addEventListener('drop', handleDrop);
        partOfSpeechContainer.appendChild(targetDiv);
    });
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
    const originalTestSelect: HTMLSelectElement = document.getElementById('testSelect') as HTMLSelectElement;
    const gameTypeSelect: HTMLSelectElement = document.getElementById('gameTypeSelect') as HTMLSelectElement;
    // Populate both dropdowns
    populateTestSelect(originalTestSelect, function () {

        // Add change event to original select
        originalTestSelect.addEventListener('change', loadSelectedTest);
        gameTypeSelect.addEventListener('change', loadSelectedTest);

        initSelectsByURL()

        if (window.innerWidth <= 1200) {
            const overlay = document.getElementById("overlay-start");
            overlay.style.display = "flex";

            // Clone the populated select
            const testSelectClone = originalTestSelect.cloneNode(true) as HTMLSelectElement;
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


});
