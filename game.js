let playerName = "שחקן"; // Default player name
let score = 0;

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

let hasEnabledVoice = false;
document.addEventListener('DOMContentLoaded', function () {
    const select = document.getElementById('testSelect');

    list.forEach(item => {
        let option = document.createElement('option');
        option.value = item.scriptUrl;
        option.textContent = item.name;
        option.dataset.lang = item.lang;
        select.appendChild(option);
    });

    select.addEventListener('change', loadSelectedTest);
    loadSelectedTest();
    setupTouchEvents();
});

function loadVoiceSettings() {
    const savedVoiceName = localStorage.getItem('selectedVoice');
    if (savedVoiceName) {
        const voiceSelect = document.getElementById('voiceSelect');
        const options = voiceSelect.options;
        for (let i = 0; i < options.length; i++) {
            if (options[i].value === savedVoiceName) {
                voiceSelect.selectedIndex = i;
                break;
            }
        }
    }
}

function saveVoiceSettings(voiceName) {
    localStorage.setItem('selectedVoice', voiceName);
}

function loadVoices(language) {
    const voiceSelect = document.getElementById('voiceSelect');
    voiceSelect.innerHTML = '';

    let attempts = 0;
    const maxAttempts = 50;

    const checkVoices = () => {
        const synth = window.speechSynthesis;
        const voices = synth.getVoices().filter(voice => voice.lang.startsWith(language));
        if (voices.length > 0 || attempts >= maxAttempts) {
            voices.forEach(voice => {
                const option = document.createElement('option');
                option.textContent = voice.name + ' (' + voice.lang + ')';
                option.value = voice.name;
                voiceSelect.appendChild(option);
            });
            loadVoiceSettings();
        } else {
            attempts++;
            setTimeout(checkVoices, 50);
        }
    };

    checkVoices();
}

function changeFontSize(change) {
    const words = document.querySelectorAll('.word, .translation');
    words.forEach(word => {
        const currentSize = parseInt(window.getComputedStyle(word, null).getPropertyValue('font-size'), 10);
        const newSize = currentSize + change;
        word.style.fontSize = `${newSize}px`;
    });
    saveFontSizeToLocal(words[0].style.fontSize);
}

function saveFontSizeToLocal(fontSize) {
    localStorage.setItem('fontSize', fontSize);
}

function loadFontSize() {
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
        const words = document.querySelectorAll('.word, .translation');
        words.forEach(word => word.style.fontSize = savedFontSize);
    }
}

document.addEventListener('DOMContentLoaded', loadFontSize);

document.getElementById('voiceSelect').addEventListener('change', function() {
    const selectedVoice = this.value;
    saveVoiceSettings(selectedVoice);
});

function loadSelectedTest() {
    const select = document.getElementById('testSelect');
    setTimeout(() => loadVoices(select.options[select.selectedIndex].dataset.lang), 100);
    loadWords(select.options[select.selectedIndex].dataset.lang);
}

function loadWords(language) {
    const select = document.getElementById('testSelect');
    const scriptUrl = select.value;
    if (scriptUrl) {
        const existingScript = document.querySelector('script[data-source="dynamic-words"]');
        if (existingScript) {
            document.body.removeChild(existingScript);
        }
        const script = document.createElement('script');
        script.src = scriptUrl;
        script.setAttribute('data-source', 'dynamic-words');
        document.body.appendChild(script);
        script.onload = () => initializeGame(language);
    }
}

function initializeGame(language = 'en-US') {
    if (!words || !Array.isArray(words)) return;

    const wordContainer = document.getElementById('wordContainer');
    const translationContainer = document.getElementById('translationContainer');
    wordContainer.innerHTML = '';
    translationContainer.innerHTML = '';
    updateScore(0);

    const shuffledWords = shuffleArray([...words]);
    const shuffledTranslations = shuffleArray([...words]);

    shuffledWords.forEach(word => {
        const wordDiv = document.createElement('div');
        wordDiv.className = 'word';
        wordDiv.textContent = word.text;
        wordDiv.draggable = true;
        wordDiv.addEventListener('dragstart', dragStart);
        wordDiv.addEventListener('touchstart', handleTouchStart);
        wordDiv.addEventListener('touchmove', handleTouchMove);
        wordDiv.addEventListener('touchend', handleTouchEnd);
        wordContainer.appendChild(wordDiv);
    });

    shuffledTranslations.forEach(word => {
        const translationDiv = document.createElement('div');
        translationDiv.className = 'translation';
        translationDiv.textContent = word.translation;
        translationDiv.addEventListener('dragover', dragOver);
        translationDiv.addEventListener('drop', drop);
        translationDiv.addEventListener('touchenter', dragOver);
        translationDiv.addEventListener('touchend', drop);
        translationContainer.appendChild(translationDiv);
    });
}

function dragStart(event) {
    event.dataTransfer.setData("text", event.target.textContent);
}

function dragOver(event) {
    event.preventDefault();
}

function drop(event) {
    event.preventDefault();
    const draggedText = event.dataTransfer.getData("text");
    const targetElement = event.target;
    if (words.some(word => word.text === draggedText && word.translation === targetElement.textContent)) {
        targetElement.classList.add("correct");
        targetElement.style.visibility = "hidden";
        document.querySelectorAll('.word').forEach(wordDiv => {
            if (wordDiv.textContent === draggedText) {
                wordDiv.style.visibility = "hidden";
            }
        });
        updateScore(score + 1);
        showMessage(true);
        if (score === words.length) {
            document.getElementById('statusMessage').textContent = "המשחק הסתיים בהצלחה!";
            showConfetti();
        }
    } else {
        showMessage(false);
    }
}

function showMessage(isCorrect) {
    const messageDiv = document.getElementById('statusMessage');
    messageDiv.textContent = isCorrect ? "כל הכבוד!" : "זה היה קרוב!";
    setTimeout(() => messageDiv.textContent = '', 3000);
}

function updateScore(newScore) {
    score = newScore;
    document.getElementById('scoreDisplay').textContent = `נקודות: ${score}`;
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
    setTimeout(() => confettiElement.remove(), 3000);
}

function setupTouchEvents() {
    const words = document.querySelectorAll('.word');
    const translations = document.querySelectorAll('.translation');

    words.forEach(word => {
        word.addEventListener('touchstart', handleTouchStart, false);
        word.addEventListener('touchmove', handleTouchMove, false);
        word.addEventListener('touchend', handleTouchEnd, false);
    });

    translations.forEach(translation => {
        translation.addEventListener('touchenter', dragOver, false);
        translation.addEventListener('touchend', drop, false);
    });
}

function handleTouchStart(event) {
    event.preventDefault();
    const touch = event.touches[0];
    event.dataTransfer.setData("text", event.target.textContent);
}

function handleTouchMove(event) {
    event.preventDefault();
    const touch = event.touches[0];
    // Mimic the dragging visual feedback if necessary
}

function handleTouchEnd(event) {
    event.preventDefault();
    // Finalize the drop if within a valid drop zone
}
