import {log, shuffleArray} from "../utilities.js";
import {GameType} from "../enums.js";
import {GameWord} from "../globalTypes.js";
import {sendEvent} from "../analytics.js";
import {VoiceService} from '../Services/VoiceService.js';
import {SoundService} from '../Services/SoundService.js';

//test commit
export class Game {
    instructionsElement: HTMLElement;
    translationContainer: HTMLElement;
    wordContainer: HTMLElement;
    words: GameWord[];
    score = 0;
    failures = 0;
    lives = 10;
    language: string;

    hasEnabledVoice = false;
    speakTimeout: ReturnType<typeof setTimeout> | undefined;

    draggedElement: HTMLElement | null = null;
    draggedElementOriginal: HTMLElement | null = null;
    draggedWord: string | null = null;

    startTime: number;
    
    // Pagination variables
    currentPage = 0;
    itemsPerPage = 3;
    wordElements: HTMLElement[] = [];
    translationElements: HTMLElement[] = [];
    completedPages: Set<number> = new Set();

    // Add a property to keep track of total pages
    totalPagesCount = 0;

    constructor(words: GameWord[], language: string) {
        this.language = language;
        this.words = words;
        this.instructionsElement = document.querySelector('.instructions')!;
        this.translationContainer = document.getElementById('targetContainer')!;
        this.wordContainer = document.getElementById('wordContainer')!;
        this.wordContainer.innerHTML = '';
        this.translationContainer.innerHTML = '';
        document.getElementById('scoreDisplay').textContent = `${this.score}`;
        document.getElementById('numFailures')!.textContent = `${this.failures}`;
        document.getElementById('livesDisplay')!.textContent = `${this.lives}`;
        
        // Explicitly create a new empty Set to avoid any reference issues
        this.completedPages = new Set<number>();
        
        // Load itemsPerPage from localStorage if available
        const savedItemsPerPage = localStorage.getItem('itemsPerPage');
        if (savedItemsPerPage) {
            this.itemsPerPage = parseInt(savedItemsPerPage);
        } else {
            // Set default to 10 if no saved preference
            this.itemsPerPage = 10;
        }

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
        // Reset pagination state
        this.currentPage = 0;
        // Ensure completedPages is a fresh empty set
        this.completedPages = new Set<number>();
        this.wordElements = [];
        this.translationElements = [];
        
        // Clear any organization attribute
        if (this.wordContainer) {
            this.wordContainer.removeAttribute('data-organized');
        }
        
        this.updateInstructions();
        this.renderWordContainer();
        this.renderTarget();
        this.renderPaginationControls();
        
        // Calculate and store initial total pages based on word count
        this.totalPagesCount = Math.ceil(this.words.length / this.itemsPerPage);
        log(`Initial total pages count set to ${this.totalPagesCount}`);
        
        // Force a complete pagination UI update to show all pages
        this.updatePaginationUI();
    }

    renderWordContainer() {
        // Store all word elements
        this.wordElements = [];
        
        const shuffledWords = shuffleArray([...this.words]);
        shuffledWords.forEach(word => {
            const wordDiv = this.createWordDiv(word, this.language);
            this.wordElements.push(wordDiv);
        });
        
        // Display current page
        this.updatePage(0);
    }

    // Group words with their matching translations on the same page
    organizeWordsByPage() {
        const totalPages = Math.ceil(this.wordElements.length / this.itemsPerPage);
        const translationElements = [...this.translationElements];
        const wordElements = [...this.wordElements];
        const organizedTranslations: HTMLElement[][] = Array(totalPages).fill(null).map(() => []);
        const organizedWords: HTMLElement[][] = Array(totalPages).fill(null).map(() => []);
        
        // First organize words into pages
        for (let i = 0; i < wordElements.length; i++) {
            const pageIndex = Math.floor(i / this.itemsPerPage);
            if (pageIndex < totalPages) {
                organizedWords[pageIndex].push(wordElements[i]);
            }
        }
        
        // Get active game type
        const activeTab = document.querySelector('.game-type-tab.active') as HTMLElement;
        const gameType = activeTab ? activeTab.getAttribute('data-game-type') : null;
        
        // For each word, find its matching translation and put it on the same page
        for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
            const wordsOnPage = organizedWords[pageIndex];
            
            for (let wordEl of wordsOnPage) {
                const wordText = wordEl.textContent;
                const word = this.words.find(w => w.text === wordText);
                
                if (word) {
                    // Find the matching translation element based on game type
                    let matchingTranslation = null;
                    
                    if (gameType === 'translation') {
                        // For translation game, match by translation text or matchesWord attribute
                        matchingTranslation = translationElements.find(tEl => 
                            tEl.textContent === word.translation || 
                            tEl.dataset.matchesWord === wordText
                        );
                    } else if (gameType === 'partOfSpeech') {
                        // For part of speech game, match by partOfSpeech or matchesWords attribute
                        matchingTranslation = translationElements.find(tEl => {
                            if (tEl.textContent === word.partOfSpeech) return true;
                            
                            // Check if word is in the comma-separated list of matching words
                            const matchesWords = tEl.dataset.matchesWords?.split(',') || [];
                            return matchesWords.includes(wordText);
                        });
                    } else if (gameType === 'missingWord') {
                        // For missing word game, match by data-selected-word attribute
                        matchingTranslation = translationElements.find(tEl => 
                            tEl.dataset.selectedWord === wordText
                        );
                    }
                    
                    if (matchingTranslation) {
                        // Remove it from the available translations array
                        const index = translationElements.indexOf(matchingTranslation);
                        if (index !== -1) {
                            translationElements.splice(index, 1);
                        }
                        // Add to this page's translations
                        organizedTranslations[pageIndex].push(matchingTranslation);
                    }
                }
            }
        }
        
        // Add remaining translations to pages that have space
        let currentPage = 0;
        for (const translation of translationElements) {
            while (currentPage < totalPages && 
                   organizedTranslations[currentPage].length >= this.itemsPerPage) {
                currentPage++;
            }
            
            if (currentPage < totalPages) {
                organizedTranslations[currentPage].push(translation);
            } else {
                // Add to last page if no space elsewhere
                organizedTranslations[totalPages - 1].push(translation);
            }
        }
        
        // Update the element arrays
        this.wordElements = organizedWords.flat();
        this.translationElements = organizedTranslations.flat();
    }

    updatePage(pageNum: number) {
        // Calculate total pages for boundary checking - use stored total pages to ensure consistency
        const contentBasedPages = Math.ceil(Math.max(this.wordElements.length, this.translationElements.length, this.words.length) / this.itemsPerPage);
        
        // Always use the higher value to prevent losing pages
        this.totalPagesCount = Math.max(this.totalPagesCount, contentBasedPages);
        
        log(`updatePage(${pageNum}): stored total pages ${this.totalPagesCount}, content-based pages ${contentBasedPages}, items per page ${this.itemsPerPage}`);
        
        // Ensure pageNum is within valid range - but use totalPagesCount for boundary
        if (pageNum >= this.totalPagesCount) {
            log(`Page ${pageNum} is out of range (total pages: ${this.totalPagesCount}), reverting to page 0`);
            this.currentPage = 0;
            pageNum = 0;
        }
        
        // If first time loading, organize words and translations
        if (this.translationElements.length > 0 && !this.wordContainer.hasAttribute('data-organized')) {
            this.organizeWordsByPage();
            this.wordContainer.setAttribute('data-organized', 'true');
        }
        
        // Clear containers
        this.wordContainer.innerHTML = '';
        this.translationContainer.innerHTML = '';
        
        // Set current page
        this.currentPage = pageNum;
        
        // Calculate bounds
        const startIdx = pageNum * this.itemsPerPage;
        const endIdx = startIdx + this.itemsPerPage;
        
        // Display words for this page
        const pageWords = this.wordElements.slice(startIdx, Math.min(endIdx, this.wordElements.length));
        pageWords.forEach(wordDiv => {
            this.wordContainer.appendChild(wordDiv);
        });
        
        // Display translations for this page
        const pageTranslations = this.translationElements.slice(startIdx, Math.min(endIdx, this.translationElements.length));
        pageTranslations.forEach(translationDiv => {
            this.translationContainer.appendChild(translationDiv);
        });
        
        // Update pagination UI to ensure all buttons are visible - be sure to preserve total page count
        this.updatePaginationUI();
        
        // Only check completion for pages with explicit completion status
        if (this.completedPages.has(pageNum)) {
            this.checkPageCompletion(pageNum);
        }
        
        log(`Page ${pageNum} loaded with ${pageWords.length} words and ${pageTranslations.length} translations. Total pages: ${this.totalPagesCount}`);
    }

    renderPaginationControls() {
        // Create pagination container if it doesn't exist
        let paginationContainer = document.getElementById('paginationContainer');
        
        if (!paginationContainer) {
            paginationContainer = document.createElement('div');
            paginationContainer.id = 'paginationContainer';
            paginationContainer.className = 'pagination-controls';
            
            // Insert BEFORE wordContainer (above the words)
            const gameArea = document.querySelector('.game-area');
            if (gameArea && this.wordContainer.parentNode) {
                gameArea.insertBefore(paginationContainer, this.wordContainer);
            }
        }
        
        // Update pagination UI (which will create/update page size selector)
        this.updatePaginationUI();
        
        // Remove any existing page size container at the bottom
        const oldPageSizeContainer = document.getElementById('pageSizeContainer');
        if (oldPageSizeContainer && oldPageSizeContainer.parentNode) {
            oldPageSizeContainer.parentNode.removeChild(oldPageSizeContainer);
        }
    }
    
    updatePaginationUI() {
        const paginationContainer = document.getElementById('paginationContainer');
        if (!paginationContainer) return;
        
        // Preserve the page size selector if it exists
        const pageSizeSelector = paginationContainer.querySelector('.page-size-selector');
        
        // Clear existing pagination
        paginationContainer.innerHTML = '';
        
        // Calculate current pages based on current content
        const contentBasedPages = Math.ceil(Math.max(this.wordElements.length, this.translationElements.length) / this.itemsPerPage);
        
        // Use the greater of stored total pages or content-based pages to ensure we never lose pages
        this.totalPagesCount = Math.max(this.totalPagesCount, contentBasedPages);
        
        // Ensure at least 1 page is shown
        const minPages = Math.max(1, this.totalPagesCount);
        
        // Create buttons container to separate buttons from page size selector
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'pagination-buttons';
        paginationContainer.appendChild(buttonsContainer);
        
        // Create page buttons for ALL available pages
        for (let i = 0; i < minPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = 'page-btn';
            pageBtn.textContent = (i + 1).toString(); // Always show number
            
            if (i === this.currentPage) {
                pageBtn.classList.add('active');
            }
            
            // Check if page is completed
            if (this.completedPages.has(i)) {
                pageBtn.classList.add('completed');
                // Add checkmark icon but keep the number
                const checkIcon = document.createElement('i');
                checkIcon.className = 'fas fa-check check-icon';
                pageBtn.appendChild(checkIcon);
            }
            
            pageBtn.addEventListener('click', () => this.updatePage(i));
            buttonsContainer.appendChild(pageBtn);
        }
        
        // Re-add the page size selector if it existed
        if (pageSizeSelector) {
            paginationContainer.appendChild(pageSizeSelector);
        } else {
            // Create page size selector if it doesn't exist
            this.createPageSizeSelector(paginationContainer);
        }
        
        // Log pagination info
        log(`Updated pagination UI: ${minPages} pages, current page: ${this.currentPage}, total pages stored: ${this.totalPagesCount}`);
    }
    
    createPageSizeSelector(paginationContainer: HTMLElement) {
        // Create page size selector
        const pageSizeContainer = document.createElement('div');
        pageSizeContainer.className = 'page-size-selector';
        
        // Create label
        const label = document.createElement('label');
        label.textContent = 'פריטים: ';
        label.htmlFor = 'pageSizeSelect';
        pageSizeContainer.appendChild(label);
        
        // Create select
        const select = document.createElement('select');
        select.id = 'pageSizeSelect';
        
        // Add options - removed 3, keeping 5, 10, 15, 20
        [5, 10, 15, 20].forEach(size => {
            const option = document.createElement('option');
            option.value = size.toString();
            option.textContent = size.toString();
            if (size === this.itemsPerPage) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        // Add change event listener
        select.addEventListener('change', () => {
            const newSize = parseInt(select.value);
            
            // Only show confirmation if the game has started (score > 0 or failures > 0)
            if (this.score > 0 || this.failures > 0) {
                // Show custom confirmation dialog
                this.showCustomConfirmDialog(
                    "שינוי מספר הפריטים בדף", 
                    "שינוי מספר הפריטים בדף יתחיל את המשחק מחדש. האם להמשיך?",
                    () => {
                        // User confirmed, restart game
                        // Save to local storage
                        localStorage.setItem('itemsPerPage', newSize.toString());
                        // Update itemsPerPage
                        this.itemsPerPage = newSize;
                        // Reload current game with clean state
                        if (typeof window['loadSelectedTest'] === 'function') {
                            window['loadSelectedTest']();
                        } else {
                            window.location.reload();
                        }
                    },
                    () => {
                        // User canceled, reset select value
                        select.value = this.itemsPerPage.toString();
                    }
                );
            } else {
                // No progress yet, just update normally
                // Save to local storage
                localStorage.setItem('itemsPerPage', newSize.toString());
                // Update itemsPerPage
                this.itemsPerPage = newSize;
                // Reload current game
                this.updatePage(0);
            }
        });
        
        pageSizeContainer.appendChild(select);
        paginationContainer.appendChild(pageSizeContainer);
    }
    
    showCustomConfirmDialog(title: string, message: string, onConfirm: () => void, onCancel: () => void) {
        // Create and append overlay
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        document.body.appendChild(overlay);
        
        // Create dialog container
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        overlay.appendChild(dialog);
        
        // Add title
        const titleElement = document.createElement('h3');
        titleElement.className = 'confirm-title';
        titleElement.textContent = title;
        dialog.appendChild(titleElement);
        
        // Add message
        const messageElement = document.createElement('p');
        messageElement.className = 'confirm-message';
        messageElement.textContent = message;
        dialog.appendChild(messageElement);
        
        // Add buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'confirm-buttons';
        dialog.appendChild(buttonsContainer);
        
        // Add confirm button
        const confirmButton = document.createElement('button');
        confirmButton.className = 'confirm-button confirm-yes';
        confirmButton.textContent = 'אישור';
        confirmButton.addEventListener('click', () => {
            document.body.removeChild(overlay);
            onConfirm();
        });
        buttonsContainer.appendChild(confirmButton);
        
        // Add cancel button
        const cancelButton = document.createElement('button');
        cancelButton.className = 'confirm-button confirm-no';
        cancelButton.textContent = 'ביטול';
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(overlay);
            onCancel();
        });
        buttonsContainer.appendChild(cancelButton);
        
        // Auto-focus on cancel button as it's the safer option
        setTimeout(() => cancelButton.focus(), 0);
    }
    
    checkPageCompletion(pageNum: number) {
        // Skip if page is already marked as completed
        if (this.completedPages.has(pageNum)) {
            return;
        }
        
        const startIdx = pageNum * this.itemsPerPage;
        const endIdx = startIdx + this.itemsPerPage;
        
        // Get words for this page
        const pageWords = this.wordElements.slice(startIdx, Math.min(endIdx, this.wordElements.length));
        
        // Only consider a page completed if it has words and all are completed
        if (pageWords.length === 0) {
            return; // Don't mark empty pages as completed at initialization
        }
        
        const allCompleted = pageWords.every(word => 
            word.classList.contains('correct') || 
            word.style.display === 'none'
        );
        
        // Only mark as completed if all words are explicitly completed
        if (allCompleted && pageWords.length > 0) {
            this.completedPages.add(pageNum);
            this.updatePaginationUI();
            
            // Check if we should automatically advance to the next uncompleted page
            if (pageNum === this.currentPage) {
                this.moveToNextUncompletedPage();
            }
            
            // Check if all pages are completed
            this.checkAllPagesCompleted();
        }
    }

    checkAllPagesCompleted() {
        // Calculate total pages
        const totalWords = this.wordElements.length;
        const totalPages = Math.ceil(totalWords / this.itemsPerPage);
        
        // Check if all pages are completed
        const allCompleted = this.completedPages.size === totalPages && totalPages > 0;
        
        // Check if all words on all pages are marked as correct or hidden
        const allWordsCompleted = this.wordElements.every(word => 
            word.classList.contains('correct') || 
            word.style.display === 'none'
        );
        
        // Log completion status
        log(`Check all pages completed: Pages ${this.completedPages.size}/${totalPages}, Words: ${this.score}/${this.words.length}, All words completed: ${allWordsCompleted}`);
        
        // If all pages are completed or all words are completed, but game over hasn't been triggered yet
        if ((allCompleted || allWordsCompleted) && this.score < this.words.length) {
            log('All pages completed but score doesn\'t match words length. Triggering game over.');
            
            // Force the score to match total words to trigger game over
            this.updateScore(this.words.length);
        }
    }

    moveToNextUncompletedPage() {
        const totalPages = Math.ceil(this.wordElements.length / this.itemsPerPage);
        
        log(`moveToNextUncompletedPage: Current page ${this.currentPage}, Total pages ${totalPages}`);
        
        // If the current page is now empty, mark it as completed if it's not already
        if (this.isPageEmpty(this.currentPage) && !this.completedPages.has(this.currentPage)) {
            log(`Current page ${this.currentPage} is empty, marking as completed`);
            this.completedPages.add(this.currentPage);
            this.updatePaginationUI();
        }
        
        // Find the next uncompleted page
        let nextPage = this.currentPage + 1;
        while (nextPage < totalPages && this.completedPages.has(nextPage)) {
            nextPage++;
        }
        
        // If we found an uncompleted page, go to it
        if (nextPage < totalPages) {
            log(`Moving to next uncompleted page: ${nextPage}`);
            this.updatePage(nextPage);
        } else {
            // Check if there are any uncompleted pages before the current one
            nextPage = 0;
            while (nextPage < this.currentPage && this.completedPages.has(nextPage)) {
                nextPage++;
            }
            
            // If we found an uncompleted page before the current one, go to it
            if (nextPage < this.currentPage && !this.completedPages.has(nextPage)) {
                log(`Moving to previous uncompleted page: ${nextPage}`);
                this.updatePage(nextPage);
            } else {
                // All pages are completed, but stay on current page and update UI
                log(`All pages completed, staying on current page: ${this.currentPage}`);
                
                // If the current page is empty, try to move to the first page
                if (this.isPageEmpty(this.currentPage)) {
                    log(`Current page is empty, moving to page 0`);
                    this.updatePage(0);
                } else {
                    // Ensure pagination is still visible
                    this.updatePaginationUI();
                }
            }
        }
    }

    updateInstructions() {
        throw new Error('This method should be implemented by subclasses.');
    }

    setInstructions(instructions: string) {
        this.instructionsElement.textContent = instructions;
    }

    renderTarget() {

        throw new Error('This method should be implemented by subclasses.');
    }

    updateScore(newScore: number) {
        log('updateScore ' + newScore);
        this.score = newScore;
        document.getElementById('scoreDisplay').textContent = `${this.score}`;

        if (this.score === this.words.length) {
            // const statusMessage = document.getElementById('statusMessage');
            // statusMessage.textContent = "המשחק הסתיים בהצלחה!"; // Set message text
            sendEvent('game over success', 'game controls', 'game over', {score: this.score, failures: this.failures});
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

    updateFailures(newVal: number) {
        log('updateFailures ' + newVal);
        this.failures = newVal;
        document.getElementById('numFailures')!.textContent = newVal.toString();

        // Update lives
        this.lives = Math.max(0, 10 - newVal);
        const livesDisplay = document.getElementById('livesDisplay')!;
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
            sendEvent('game over failure', 'game controls', 'game over', {score: this.score, failures: this.failures});
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

    checkCorrectness(dropTarget: HTMLElement) {
        const activeTab = document.querySelector('.game-type-tab.active') as HTMLElement;
        const gameType = activeTab ? activeTab.getAttribute('data-game-type') : null;
        log(`Checking correctness: Dragged [${this.draggedElement.textContent}], Target [${dropTarget.textContent}], Game Type [${gameType}]`);

        if (gameType === GameType.TRANSLATION) {
            const isMatch = this.words.some(word => word.text === this.draggedElement.textContent && word.translation === dropTarget.textContent);
            log(`Translation match: ${isMatch}`);
            return isMatch;
        } else if (gameType === GameType.PART_OF_SPEECH) {
            const isMatch = this.words.some(word => word.text === this.draggedElement.textContent && word.partOfSpeech === dropTarget.textContent);
            log(`Part of speech match: ${isMatch}`);
            return isMatch;
        } else if (gameType === GameType.MISSING_WORD) {
            // Check if the dragged word correctly fills the blank in the target sentence
            const isMatch = this.draggedElement.textContent === dropTarget.dataset.selectedWord;
            log(`Missing word match: ${isMatch}`);
            return isMatch;
        }

        log('Invalid game type or no match found');
        return false;
    }

    handleMouseEnter(wordDiv: HTMLElement, language: string) {
        // log('handleMouseEnter ' + wordDiv.textContent + ' ' + language + ' ' + this.hasEnabledVoice);

    }

    createWordDiv(word: GameWord, language: string) {
        const wordDiv = document.createElement('div');
        wordDiv.className = 'word';
        wordDiv.textContent = word.text;
        wordDiv.dataset.translation = word.translation;
        wordDiv.draggable = true;
        wordDiv.addEventListener('dragstart', (event) => this.handleDragStart(event, language));
        wordDiv.addEventListener('dragend', this.handleDragEnd);

        wordDiv.addEventListener('touchstart', (event) => this.handleTouchStart(event, language), {passive: false});
        document.addEventListener('touchcancel', this.handleTouchCancel, {passive: false});
        wordDiv.addEventListener('touchmove', this.handleTouchMove, {passive: false});
        wordDiv.addEventListener('touchend', this.handleTouchEnd, {passive: false});

        wordDiv.addEventListener('mouseenter', () => this.handleMouseEnter(wordDiv, language));
        wordDiv.addEventListener('mouseleave', () => clearTimeout(this.speakTimeout));
        return wordDiv;
    }

    handleDragLeave(event: DragEvent) {
        log('dragLeave');
        const target = event.target as HTMLElement;
        if (target.classList.contains('highlight')) {
            target.classList.remove('highlight');
        }

        document.querySelectorAll('.dragging').forEach(el => {
            el.classList.remove('dragging');
        });
    }

    handleDrop(event: DragEvent) {
        log('handleDrop');
        event.preventDefault();

        if (!this.draggedElement) return;

        const dropTarget = event.target as HTMLElement;
        if (dropTarget.classList.contains('translation')) {
            dropTarget.classList.remove('highlight');
        }

        if (dropTarget.classList.contains('translation')) {
            const isCorrect = this.checkCorrectness(dropTarget);
            this.handleAnswer(dropTarget, isCorrect, this.draggedElement);
        }
        this.resetDraggedElement();
    }

    handleTouchStart(event: TouchEvent, language: string) {
        event.preventDefault();
        this.draggedElementOriginal = event.target as HTMLElement;
        this.draggedElement = this.draggedElementOriginal.cloneNode(true) as HTMLElement;
        
        // Add to body immediately with initial position for better performance
        document.body.appendChild(this.draggedElement);
        this.draggedElement.style.position = 'fixed';
        this.draggedElement.style.zIndex = '1000';
        this.draggedElement.style.opacity = '0.7';
        this.draggedElement.style.willChange = 'transform, left, top'; // Optimize for GPU acceleration
        this.draggedElement.classList.add('dragging');
        
        // Position immediately for instant feedback
        const touch = event.touches[0];
        const x = touch.clientX - (this.draggedElement.offsetWidth / 2);
        const y = touch.clientY - (this.draggedElement.offsetHeight / 2);
        this.draggedElement.style.left = `${x}px`;
        this.draggedElement.style.top = `${y}px`;
        
        // Speak after element is visible for better perceived performance
        VoiceService.getInstance().speak(this.draggedElement.textContent, language);
    }

    handleTouchCancel(event: TouchEvent) {
        event.preventDefault();
        if (!this.draggedElement) return;
        document.body.removeChild(this.draggedElement);
        this.resetDraggedElement();
    }

    handleTouchMove(event: TouchEvent) {
        if (!this.draggedElement) return;
        event.preventDefault();
        
        // Get the touch coordinates
        const touch = event.touches[0];
        
        // Calculate position - use transform for better performance
        const x = touch.clientX - (this.draggedElement.offsetWidth / 2);
        const y = touch.clientY - (this.draggedElement.offsetHeight / 2);
        
        // Use transform instead of left/top for better performance
        this.draggedElement.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        this.draggedElement.style.left = '0';
        this.draggedElement.style.top = '0';
        
        // Only update highlight every other move for better performance
        if (event.timeStamp % 2 === 0) {
            // Find target element - use elementFromPoint for more accurate detection
            const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);
            if (elementAtPoint && elementAtPoint.classList && elementAtPoint.classList.contains('translation')) {
                // Remove highlight from all other elements first
                document.querySelectorAll('.translation.highlight').forEach(el => {
                    if (el !== elementAtPoint) el.classList.remove('highlight');
                });
                elementAtPoint.classList.add('highlight');
            }
        }
    }

    handleTouchEnd(event: TouchEvent) {
        event.preventDefault();
        if (!this.draggedElement) return;

        // Get touch position
        const touch = event.changedTouches[0];
        
        // Remove any highlight from translation elements
        document.querySelectorAll('.translation.highlight').forEach(el => {
            el.classList.remove('highlight');
        });
        
        // Hide dragged element to get accurate elementFromPoint
        this.draggedElement.style.display = 'none';
        
        // Get element at touch position
        let dropTarget = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
        this.draggedElement.style.display = 'block';
        
        // Find translation parent if we're on a child element
        while (dropTarget && !dropTarget.classList?.contains('translation') && dropTarget.parentElement) {
            dropTarget = dropTarget.parentElement;
        }

        if (!dropTarget?.classList?.contains('translation')) {
            document.body.removeChild(this.draggedElement);
            this.resetDraggedElement();
            return;
        }

        // Process correct drop target
        const isCorrect = this.checkCorrectness(dropTarget);
        this.handleAnswer(dropTarget, isCorrect, this.draggedElementOriginal);

        document.body.removeChild(this.draggedElement);
        this.resetDraggedElement();
    }


    resetDraggedElement() {

        log('resetDraggedElement');
        document.querySelectorAll('.dragging').forEach(el => {
            el.classList.remove('dragging');
        });


    }

    handleDragStart(event: DragEvent, language: string) {
        this.draggedElement = event.target as HTMLElement;
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

    handleDragEnd(event: DragEvent) {
        log('dragEnd');
        if (this.draggedElement) {
            this.resetDraggedElement();
        }
    }

    handleDragOver(event: DragEvent) {
        log('dragOver');
        event.preventDefault();
        const target = event.target as HTMLElement;
        if (target.classList.contains('translation')) {
            target.classList.add('highlight');
        }
    }

    handleAnswer(targetEl: HTMLElement, isCorrect: boolean, wordElement: HTMLElement) {
        const activeTab2 = document.querySelector('.game-type-tab.active') as HTMLElement;
        const gameType2 = activeTab2 ? (activeTab2.getAttribute('data-game-type') as typeof GameType[keyof typeof GameType]) : null;
        const self = this;
        log('handleAnswer ' + targetEl.textContent + ' ' + wordElement.textContent + ' ' + isCorrect);
        const blinkClass = isCorrect ? 'blink-correct' : 'blink-incorrect';

        // Play sound effect
        const soundService = SoundService.getInstance();
        if (isCorrect) {
            soundService.playCorrectSound();
        } else {
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
                        
                        // Update translation elements array to remove matched item
                        self.translationElements = self.translationElements.filter(element => element !== targetEl);
                        
                        // IMPORTANT: Preserve total page count before checking completion
                        const beforeCheckTotalPages = self.totalPagesCount;
                        
                        // Check if current page is now completed after removing this translation
                        self.checkPageCompletion(self.currentPage);
                        
                        // Check if only the current page has become empty
                        if (self.isPageEmpty(self.currentPage)) {
                            // Only mark this specific page as completed
                            self.completedPages.add(self.currentPage);
                            // Ensure we preserve the total page count
                            self.totalPagesCount = Math.max(beforeCheckTotalPages, self.totalPagesCount);
                            self.updatePaginationUI();
                            self.moveToNextUncompletedPage();
                        }
                    });
                } else if (gameType2 === GameType.MISSING_WORD) {
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
                    
                    // Update word elements array to remove matched item
                    self.wordElements = self.wordElements.filter(element => element !== wordElement);
                    
                    // IMPORTANT: Preserve total page count before checking completion
                    const beforeCheckTotalPages = self.totalPagesCount;
                    
                    // Check if current page is now completed after removing this word
                    self.checkPageCompletion(self.currentPage);
                    
                    // Check if only the current page has become empty
                    if (self.isPageEmpty(self.currentPage)) {
                        // Only mark this specific page as completed
                        self.completedPages.add(self.currentPage);
                        // Ensure we preserve the total page count
                        self.totalPagesCount = Math.max(beforeCheckTotalPages, self.totalPagesCount);
                        self.updatePaginationUI();
                        self.moveToNextUncompletedPage();
                    }
                });
            }
        });

        // Update the game score and failure count
        if (isCorrect) {
            this.updateScore(this.score + 1);
        } else {
            this.updateFailures(this.failures + 1);
        }
    }

    showSummaryCard(success: boolean) {
        // Hide word and translation containers
        this.wordContainer.style.display = 'none';
        this.translationContainer.style.display = 'none';
        
        // Hide pagination container
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) {
            paginationContainer.style.display = 'none';
        }
        
        // Hide the separator if present
        const separator = document.querySelector('.separator') as HTMLElement;
        if (separator) separator.style.display = 'none';

        // Get or create the summary card
        let summaryCard = document.getElementById('summaryCard');
        if (!summaryCard) {
            summaryCard = document.createElement('div');
            summaryCard.id = 'summaryCard';
            summaryCard.className = 'summary-card';
        }
        
        // Position summary card after instructions
        const instructionsElement = document.querySelector('.instructions');
        if (instructionsElement && instructionsElement.parentNode) {
            // Insert after instructions
            if (instructionsElement.nextSibling) {
                instructionsElement.parentNode.insertBefore(summaryCard, instructionsElement.nextSibling);
            } else {
                instructionsElement.parentNode.appendChild(summaryCard);
            }
        } else {
            // Fallback to game area if instructions not found
            const gameArea = document.querySelector('.game-area');
            if (gameArea) {
                gameArea.insertBefore(summaryCard, gameArea.firstChild);
            } else {
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
            const newBtn = newGameBtnBottom.cloneNode(true) as HTMLElement;
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
                } else {
                    window.location.reload();
                }
            });
        }
        
        // Show the card
        summaryCard.style.display = 'block';
        
        // Log that summary card is shown
        log('Summary card displayed, pagination hidden');
    }

    hideSummaryCardAndShowContainers() {
        // Show word and translation containers
        this.wordContainer.style.display = '';
        this.translationContainer.style.display = '';
        // Show the separator if present
        const separator = document.querySelector('.separator') as HTMLElement;
        if (separator) separator.style.display = '';
        // Hide summary card
        const summaryCard = document.getElementById('summaryCard');
        if (summaryCard) summaryCard.style.display = 'none';
        // Move newGameBtnBottom back after game area if needed
        const newGameBtnBottom = document.getElementById('newGameBtnBottom');
        const gameArea = document.querySelector('.game-area');
        if (newGameBtnBottom && gameArea && !gameArea.nextSibling?.isSameNode(newGameBtnBottom)) {
            newGameBtnBottom.classList.remove('summary-new-game-btn');
            gameArea.parentNode.insertBefore(newGameBtnBottom, gameArea.nextSibling);
        }
    }

    static hideSummaryCardAndShowContainersStatic() {
        // Show word and translation containers
        const wordContainer = document.getElementById('wordContainer');
        const translationContainer = document.getElementById('targetContainer');
        if (wordContainer) wordContainer.style.display = '';
        if (translationContainer) translationContainer.style.display = '';
        // Show the separator if present
        const separator = document.querySelector('.separator') as HTMLElement;
        if (separator) separator.style.display = '';
        // Show pagination container if it exists
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) paginationContainer.style.display = '';
        // Hide summary card
        const summaryCard = document.getElementById('summaryCard');
        if (summaryCard) summaryCard.style.display = 'none';
        // Move newGameBtnBottom back after game area if needed
        const newGameBtnBottom = document.getElementById('newGameBtnBottom');
        const gameArea = document.querySelector('.game-area');
        if (newGameBtnBottom && gameArea && !gameArea.nextSibling?.isSameNode(newGameBtnBottom)) {
            newGameBtnBottom.classList.remove('summary-new-game-btn');
            gameArea.parentNode.insertBefore(newGameBtnBottom, gameArea.nextSibling);
        }
    }

    // Check if a specific page is empty or contains all completed words
    isPageEmpty(pageNum: number) {
        // If checking the current page, use DOM elements
        if (pageNum === this.currentPage) {
            const visibleWords = Array.from(document.querySelectorAll('#wordContainer > .word'))
                .filter((wordEl: HTMLElement) => 
                    wordEl.offsetParent !== null && // Check if element is visible in DOM
                    wordEl.style.display !== 'none' && 
                    !wordEl.classList.contains('correct')
                );
                
            const visibleTranslations = Array.from(document.querySelectorAll('#targetContainer > .translation'))
                .filter((translationEl: HTMLElement) => 
                    translationEl.offsetParent !== null &&
                    translationEl.style.display !== 'none'
                );
                
            // Log page empty status for debugging
            log(`isPageEmpty for page ${pageNum}: Words: ${visibleWords.length}, Translations: ${visibleTranslations.length}`);
            
            // If there are no visible words or translations on the current page
            if (visibleWords.length === 0 || visibleTranslations.length === 0) {
                return true;
            }
            
            return false;
        }
        // For other pages, check the wordElements and translationElements arrays
        else {
            const startIdx = pageNum * this.itemsPerPage;
            const endIdx = startIdx + this.itemsPerPage;
            
            // If we're beyond the available words, the page is empty
            if (startIdx >= this.wordElements.length) {
                log(`isPageEmpty: Page ${pageNum} is beyond available words range`);
                return true;
            }
            
            const pageWords = this.wordElements.slice(startIdx, Math.min(endIdx, this.wordElements.length))
                .filter(word => 
                    word.style.display !== 'none' && 
                    !word.classList.contains('correct')
                );
                
            const pageTranslations = this.translationElements.slice(startIdx, Math.min(endIdx, this.translationElements.length))
                .filter(translation => translation.style.display !== 'none');
            
            // Log page empty status for debugging
            log(`isPageEmpty for page ${pageNum}: Words: ${pageWords.length}, Translations: ${pageTranslations.length}`);
            
            return pageWords.length === 0 || pageTranslations.length === 0;
        }
    }
}