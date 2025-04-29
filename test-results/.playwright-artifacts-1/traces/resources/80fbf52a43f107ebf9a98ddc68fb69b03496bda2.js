import { log, shuffleArray } from "../utilities.js";
import { GameType } from "../enums.js";
import { sendEvent } from "../analytics.js";
import { VoiceService } from '../Services/VoiceService.js';
import { SoundService } from '../Services/SoundService.js';
//test commit
export class Game {
    constructor(words, language) {
        this.score = 0;
        this.failures = 0;
        this.lives = 10;
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
        document.getElementById('livesDisplay').textContent = `${this.lives}`;
        // Re-enable game area
        const gameArea = document.querySelector('.game-area');
        gameArea.classList.remove('disabled');
        this.startTime = Date.now();
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
            // const statusMessage = document.getElementById('statusMessage');
            // statusMessage.textContent = "המשחק הסתיים בהצלחה!"; // Set message text
            sendEvent('game over success', 'game controls', 'game over', { score: this.score, failures: this.failures });
            // statusMessage.classList.add('show');
            // Show new game buttons
            const newGameBtn = document.getElementById('newGameBtn');
            const newGameBtnBottom = document.getElementById('newGameBtnBottom');
            newGameBtn.style.display = 'inline-block';
            newGameBtnBottom.style.display = 'block';
            newGameBtn.classList.add('blink-once');
            newGameBtnBottom.classList.add('blink-once');
            // No longer disable game area
            // const gameArea = document.querySelector('.game-area');
            // gameArea.classList.add('disabled');
            // Play success game over sound instead of regular game over sound
            SoundService.getInstance().playGameOverSuccessSound();
            // Use setTimeout to allow the browser to redraw, then re-add the show class
            // setTimeout(() => {
            //     statusMessage.classList.remove('show');
            // }, 4000); // Short delay
            this.showConfetti();
            this.showSummaryCard(true);
        }
    }
    updateFailures(newVal) {
        log('updateFailures ' + newVal);
        this.failures = newVal;
        document.getElementById('numFailures').textContent = newVal.toString();
        // Update lives
        this.lives = Math.max(0, 10 - newVal);
        const livesDisplay = document.getElementById('livesDisplay');
        livesDisplay.textContent = `${this.lives}`;
        // Add visual feedback when lives change
        livesDisplay.classList.add('blink-once');
        setTimeout(() => {
            livesDisplay.classList.remove('blink-once');
        }, 300);
        // Check for game over when lives reach 0
        if (this.lives <= 0) {
            // const statusMessage = document.getElementById('statusMessage');
            // statusMessage.textContent = "המשחק הסתיים! נסה שוב!"; // Game over message
            sendEvent('game over failure', 'game controls', 'game over', { score: this.score, failures: this.failures });
            // statusMessage.classList.add('show');
            // Show new game buttons
            const newGameBtn = document.getElementById('newGameBtn');
            const newGameBtnBottom = document.getElementById('newGameBtnBottom');
            newGameBtn.style.display = 'inline-block';
            newGameBtnBottom.style.display = 'block';
            // newGameBtn.classList.add('blink-once');
            // newGameBtnBottom.classList.add('blink-once');
            // No longer disable game area
            // const gameArea = document.querySelector('.game-area');
            // gameArea.classList.add('disabled');
            // Play game over sound
            SoundService.getInstance().playGameOverSound();
            // Use setTimeout to allow the browser to redraw, then re-add the show class
            // setTimeout(() => {
            //     statusMessage.classList.remove('show');
            // }, 4000); // Short delay
            this.showSummaryCard(false);
        }
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
        const activeTab = document.querySelector('.game-type-tab.active');
        const gameType = activeTab ? activeTab.getAttribute('data-game-type') : null;
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
        wordDiv.dataset.translation = word.translation;
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
        VoiceService.getInstance().speak(this.draggedElement.textContent, language).then(() => {
            document.body.appendChild(this.draggedElement);
            this.draggedElement.style.position = 'fixed';
            this.draggedElement.style.zIndex = '1000';
            this.draggedElement.style.opacity = '0.5';
            this.handleTouchMove(event);
            this.draggedElement.classList.add('dragging');
        });
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
        VoiceService.getInstance().speak(this.draggedWord, language).then(() => {
            log('dragStart ' + this.draggedElement.textContent);
            event.dataTransfer.setData("text", this.draggedElement.textContent);
            document.querySelectorAll('.word').forEach(wordDiv => {
                wordDiv.classList.remove('dragging');
            });
            this.draggedElement.classList.add('dragging');
        });
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
        const activeTab2 = document.querySelector('.game-type-tab.active');
        const gameType2 = activeTab2 ? activeTab2.getAttribute('data-game-type') : null;
        const self = this;
        log('handleAnswer ' + targetEl.textContent + ' ' + wordElement.textContent + ' ' + isCorrect);
        const blinkClass = isCorrect ? 'blink-correct' : 'blink-incorrect';
        // Play sound effect
        const soundService = SoundService.getInstance();
        if (isCorrect) {
            soundService.playCorrectSound();
        }
        else {
            soundService.playIncorrectSound();
        }
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
                if (gameType2 === GameType.TRANSLATION) {
                    targetEl.style.transition = 'opacity 0.3s, transform 0.3s';
                    targetEl.style.opacity = '0';
                    targetEl.style.transform = 'scale(0)';
                    targetEl.addEventListener('transitionend', function onTransitionEnd() {
                        targetEl.style.display = 'none';
                        targetEl.removeEventListener('transitionend', onTransitionEnd);
                    });
                }
                else if (gameType2 === GameType.MISSING_WORD) {
                    self.renderTarget();
                }
            }
        });
        wordElement.classList.add(blinkClass);
        wordElement.addEventListener('animationend', function onAnimationEnd() {
            wordElement.classList.remove(blinkClass);
            wordElement.removeEventListener('animationend', onAnimationEnd);
            if (isCorrect) {
                wordElement.style.transition = 'opacity 0.3s, transform 0.3s';
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
    showSummaryCard(success) {
        // Hide word and translation containers
        this.wordContainer.style.display = 'none';
        this.translationContainer.style.display = 'none';
        // Hide the separator if present
        const separator = document.querySelector('.separator');
        if (separator)
            separator.style.display = 'none';
        // Get or create the summary card
        let summaryCard = document.getElementById('summaryCard');
        if (!summaryCard) {
            summaryCard = document.createElement('div');
            summaryCard.id = 'summaryCard';
            summaryCard.className = 'summary-card';
            // Insert as first child of .game-area
            const gameArea = document.querySelector('.game-area');
            if (gameArea) {
                gameArea.insertBefore(summaryCard, gameArea.firstChild);
            }
            else {
                document.body.appendChild(summaryCard);
            }
        }
        // Clear existing content
        summaryCard.innerHTML = '';
        // Create card content
        const totalTime = Math.round((Date.now() - this.startTime) / 1000);
        // Add heading
        const heading = document.createElement('h2');
        heading.textContent = 'סיכום משחק';
        summaryCard.appendChild(heading);
        // Add time info
        const timeDiv = document.createElement('div');
        timeDiv.innerHTML = `⏱️ זמן: <b>${totalTime} שניות</b>`;
        summaryCard.appendChild(timeDiv);
        // Add errors info
        const errorsDiv = document.createElement('div');
        errorsDiv.innerHTML = `❌ שגיאות: <b>${this.failures}</b>`;
        summaryCard.appendChild(errorsDiv);
        // Add score info
        const scoreDiv = document.createElement('div');
        scoreDiv.innerHTML = `✅ ניקוד: <b>${this.score}</b>`;
        summaryCard.appendChild(scoreDiv);
        // Add the new game button
        const newGameBtnBottom = document.getElementById('newGameBtnBottom');
        if (newGameBtnBottom) {
            newGameBtnBottom.style.display = 'block';
            newGameBtnBottom.classList.add('summary-new-game-btn');
            // Clear existing event listeners by cloning
            const newBtn = newGameBtnBottom.cloneNode(true);
            newBtn.id = newGameBtnBottom.id;
            if (newGameBtnBottom.parentNode) {
                newGameBtnBottom.parentNode.replaceChild(newBtn, newGameBtnBottom);
            }
            // Add to summary card
            summaryCard.appendChild(newBtn);
            // Add event listener
            newBtn.addEventListener('click', () => {
                Game.hideSummaryCardAndShowContainersStatic();
                newBtn.style.display = 'none';
                if (typeof window['loadSelectedTest'] === 'function') {
                    window['loadSelectedTest']();
                }
                else {
                    window.location.reload();
                }
            });
        }
        // Show the card
        summaryCard.style.display = 'block';
    }
    hideSummaryCardAndShowContainers() {
        var _a;
        // Show word and translation containers
        this.wordContainer.style.display = '';
        this.translationContainer.style.display = '';
        // Show the separator if present
        const separator = document.querySelector('.separator');
        if (separator)
            separator.style.display = '';
        // Hide summary card
        const summaryCard = document.getElementById('summaryCard');
        if (summaryCard)
            summaryCard.style.display = 'none';
        // Move newGameBtnBottom back after game area if needed
        const newGameBtnBottom = document.getElementById('newGameBtnBottom');
        const gameArea = document.querySelector('.game-area');
        if (newGameBtnBottom && gameArea && !((_a = gameArea.nextSibling) === null || _a === void 0 ? void 0 : _a.isSameNode(newGameBtnBottom))) {
            newGameBtnBottom.classList.remove('summary-new-game-btn');
            gameArea.parentNode.insertBefore(newGameBtnBottom, gameArea.nextSibling);
        }
    }
    static hideSummaryCardAndShowContainersStatic() {
        var _a;
        // Show word and translation containers
        const wordContainer = document.getElementById('wordContainer');
        const translationContainer = document.getElementById('targetContainer');
        if (wordContainer)
            wordContainer.style.display = '';
        if (translationContainer)
            translationContainer.style.display = '';
        // Show the separator if present
        const separator = document.querySelector('.separator');
        if (separator)
            separator.style.display = '';
        // Hide summary card
        const summaryCard = document.getElementById('summaryCard');
        if (summaryCard)
            summaryCard.style.display = 'none';
        // Move newGameBtnBottom back after game area if needed
        const newGameBtnBottom = document.getElementById('newGameBtnBottom');
        const gameArea = document.querySelector('.game-area');
        if (newGameBtnBottom && gameArea && !((_a = gameArea.nextSibling) === null || _a === void 0 ? void 0 : _a.isSameNode(newGameBtnBottom))) {
            newGameBtnBottom.classList.remove('summary-new-game-btn');
            gameArea.parentNode.insertBefore(newGameBtnBottom, gameArea.nextSibling);
        }
    }
}
