import { log, shuffleArray } from "../utilities.js";
import { GameType } from "../enums.js";
import { sendEvent } from "../analytics.js";
import { VoiceService } from '../Services/VoiceService.js';
export class Game {
    constructor(words, language) {
        this.score = 0;
        this.failures = 0;
        this.hasEnabledVoice = false;
        this.draggedElement = null;
        this.draggedElementOriginal = null;
        this.draggedWord = null;
        this.language = language;
        this.words = words;
        this.instructionsElement = document.querySelector('.instructions');
        this.translationContainer = document.getElementById('targetContainer');
        this.wordContainer = document.getElementById('wordContainer');
        this.wordContainer.innerHTML = '';
        this.translationContainer.innerHTML = '';
        document.getElementById('scoreDisplay').textContent = `${this.score}`;
        document.getElementById('numFailures').textContent = `${this.failures}`;
        this.bindEventHandlers();
    }
    bindEventHandlers() {
        this.handleDragOver = this.handleDragOver.bind(this);
        this.handleDragLeave = this.handleDragLeave.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchCancel = this.handleTouchCancel.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleDragStart = this.handleDragStart.bind(this);
        this.handleDragEnd = this.handleDragEnd.bind(this);
    }
    render() {
        this.updateInstructions();
        this.renderWordContainer();
        this.renderTarget();
    }
    renderWordContainer() {
        const shuffledWords = shuffleArray([...this.words]);
        shuffledWords.forEach(word => {
            const wordDiv = this.createWordDiv(word, this.language);
            this.wordContainer.appendChild(wordDiv);
        });
    }
    updateInstructions() {
        throw new Error('This method should be implemented by subclasses.');
    }
    setInstructions(instructions) {
        this.instructionsElement.textContent = instructions;
    }
    renderTarget() {
        throw new Error('This method should be implemented by subclasses.');
    }
    updateScore(newScore) {
        log('updateScore ' + newScore);
        this.score = newScore;
        document.getElementById('scoreDisplay').textContent = `${this.score}`;
        if (this.score === this.words.length) {
            const statusMessage = document.getElementById('statusMessage');
            statusMessage.textContent = "המשחק הסתיים בהצלחה!"; // Set message text
            sendEvent('game over success', 'game controls', 'game over', { score: this.score, failures: this.failures });
            statusMessage.classList.add('show');
            // Use setTimeout to allow the browser to redraw, then re-add the show class
            setTimeout(() => {
                statusMessage.classList.remove('show');
            }, 4000); // Short delay
            this.showConfetti();
        }
    }
    updateFailures(newVal) {
        log('updateFailures ' + newVal);
        this.failures = newVal;
        document.getElementById('numFailures').textContent = newVal.toString();
    }
    showConfetti() {
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
    checkCorrectness(dropTarget) {
        const gameTypeSelect = document.getElementById('gameTypeSelect');
        const gameType = gameTypeSelect.value;
        log(`Checking correctness: Dragged [${this.draggedElement.textContent}], Target [${dropTarget.textContent}], Game Type [${gameType}]`);
        if (gameType === GameType.TRANSLATION) {
            const isMatch = this.words.some(word => word.text === this.draggedElement.textContent && word.translation === dropTarget.textContent);
            log(`Translation match: ${isMatch}`);
            return isMatch;
        }
        else if (gameType === GameType.PART_OF_SPEECH) {
            const isMatch = this.words.some(word => word.text === this.draggedElement.textContent && word.partOfSpeech === dropTarget.textContent);
            log(`Part of speech match: ${isMatch}`);
            return isMatch;
        }
        else if (gameType === GameType.MISSING_WORD) {
            // Check if the dragged word correctly fills the blank in the target sentence
            const isMatch = this.draggedElement.textContent === dropTarget.dataset.selectedWord;
            log(`Missing word match: ${isMatch}`);
            return isMatch;
        }
        log('Invalid game type or no match found');
        return false;
    }
    handleMouseEnter(wordDiv, language) {
        // log('handleMouseEnter ' + wordDiv.textContent + ' ' + language + ' ' + this.hasEnabledVoice);
    }
    createWordDiv(word, language) {
        const wordDiv = document.createElement('div');
        wordDiv.className = 'word';
        wordDiv.textContent = word.text;
        wordDiv.draggable = true;
        wordDiv.addEventListener('dragstart', (event) => this.handleDragStart(event, language));
        wordDiv.addEventListener('dragend', this.handleDragEnd);
        wordDiv.addEventListener('touchstart', (event) => this.handleTouchStart(event, language));
        document.addEventListener('touchcancel', this.handleTouchCancel, { passive: false });
        wordDiv.addEventListener('touchmove', this.handleTouchMove);
        wordDiv.addEventListener('touchend', this.handleTouchEnd);
        wordDiv.addEventListener('mouseenter', () => this.handleMouseEnter(wordDiv, language));
        wordDiv.addEventListener('mouseleave', () => clearTimeout(this.speakTimeout));
        return wordDiv;
    }
    handleDragLeave(event) {
        log('dragLeave');
        const target = event.target;
        if (target.classList.contains('highlight')) {
            target.classList.remove('highlight');
        }
        document.querySelectorAll('.dragging').forEach(el => {
            el.classList.remove('dragging');
        });
    }
    handleDrop(event) {
        log('handleDrop');
        event.preventDefault();
        if (!this.draggedElement)
            return;
        const dropTarget = event.target;
        if (dropTarget.classList.contains('translation')) {
            dropTarget.classList.remove('highlight');
        }
        if (dropTarget.classList.contains('translation')) {
            const isCorrect = this.checkCorrectness(dropTarget);
            this.handleAnswer(dropTarget, isCorrect, this.draggedElement);
        }
        this.resetDraggedElement();
    }
    handleTouchStart(event, language) {
        event.preventDefault();
        this.draggedElementOriginal = event.target;
        this.draggedElement = this.draggedElementOriginal.cloneNode(true);
        document.body.appendChild(this.draggedElement);
        this.draggedElement.style.position = 'fixed';
        this.draggedElement.style.zIndex = '1000';
        // this.draggedElement.style.border = '2px dashed red'; // Optional: add a dashed border
        this.draggedElement.style.opacity = '0.5'; // Optional: make the clone semi-transparent
        this.handleTouchMove(event); // Update position immediately
        this.draggedElementOriginal.classList.add('dragging'); // Indicate original element is being dragged
        VoiceService.getInstance().speak(this.draggedElement.textContent, language);
    }
    handleTouchCancel(event) {
        log('handleTouchCancel');
        event.preventDefault();
        if (!this.draggedElement)
            return;
        document.body.removeChild(this.draggedElement); // Remove the cloned element
        this.resetDraggedElement();
    }
    handleTouchMove(event) {
        if (!this.draggedElement)
            return;
        const touch = event.touches[0];
        this.draggedElement.style.left = `${touch.clientX - (this.draggedElement.offsetWidth / 2)}px`;
        this.draggedElement.style.top = `${touch.clientY - (this.draggedElement.offsetHeight / 2)}px`;
        const target = event.target;
        if (target.classList.contains('translation')) {
            target.classList.add('highlight');
        }
    }
    handleTouchEnd(event) {
        event.preventDefault();
        if (!this.draggedElement)
            return;
        this.draggedElement.style.display = 'none';
        const touch = event.changedTouches[0];
        let dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
        // Re-display the dragged element
        this.draggedElement.style.display = 'block';
        // Navigate up the DOM tree to find the drop target with 'translation' class if not directly hit
        while (dropTarget && dropTarget.classList && !dropTarget.classList.contains('translation') && dropTarget.parentNode) {
            dropTarget = dropTarget.parentNode;
        }
        if (!dropTarget) {
            log('handleTouchEnd no dropTarget');
            document.body.removeChild(this.draggedElement); // Remove the cloned element
            this.resetDraggedElement(); // Reset styles and cleanup
            return;
        }
        if (dropTarget && dropTarget.classList && dropTarget.classList.contains('translation')) {
            const isCorrect = this.checkCorrectness(dropTarget);
            this.handleAnswer(dropTarget, isCorrect, this.draggedElementOriginal);
        }
        document.body.removeChild(this.draggedElement); // Remove the cloned element
        this.resetDraggedElement(); // Reset styles and cleanup
    }
    resetDraggedElement() {
        log('resetDraggedElement');
        document.querySelectorAll('.dragging').forEach(el => {
            el.classList.remove('dragging');
        });
    }
    handleDragStart(event, language) {
        this.draggedElement = event.target;
        this.draggedWord = this.draggedElement.textContent;
        log('dragStart ' + this.draggedElement.textContent);
        event.dataTransfer.setData("text", this.draggedElement.textContent);
        document.querySelectorAll('.word').forEach(wordDiv => {
            wordDiv.classList.remove('dragging');
        });
        this.draggedElement.classList.add('dragging');
        VoiceService.getInstance().speak(this.draggedWord, language);
    }
    handleDragEnd(event) {
        log('dragEnd');
        if (this.draggedElement) {
            this.resetDraggedElement();
        }
    }
    handleDragOver(event) {
        log('dragOver');
        event.preventDefault();
        const target = event.target;
        if (target.classList.contains('translation')) {
            target.classList.add('highlight');
        }
    }
    handleAnswer(targetEl, isCorrect, wordElement) {
        const gameType = document.getElementById('gameTypeSelect').value;
        const self = this;
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
                if (gameType === GameType.TRANSLATION) {
                    targetEl.style.transition = 'opacity 0.5s, transform 0.5s';
                    targetEl.style.opacity = '0';
                    targetEl.style.transform = 'scale(0)';
                    targetEl.addEventListener('transitionend', function onTransitionEnd() {
                        targetEl.style.display = 'none';
                        targetEl.removeEventListener('transitionend', onTransitionEnd);
                    });
                }
                else if (gameType === GameType.MISSING_WORD) {
                    self.renderTarget();
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
            this.updateScore(this.score + 1);
        }
        else {
            this.updateFailures(this.failures + 1);
        }
    }
}
