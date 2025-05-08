import { Game } from "./Game.js";
import { GameWord } from "../globalTypes.js";
import { shuffleArray } from "../utilities.js";
import { log } from "../utilities.js";
import { SoundService } from '../Services/SoundService.js';

export class FallingWordsGame extends Game {
    private gameContainer: HTMLElement;
    private fallingWords: HTMLElement[] = [];
    private animationFrameId: number | null = null;
    private lastTimestamp: number = 0;
    private spawnInterval: number = 800; // Increased from 400ms to 800ms for slower spawning
    private lastSpawnTime: number = 0;
    private gameRunning: boolean = false;
    private firstWordSelected: HTMLElement | null = null;
    private wordPairs: {originalWord: GameWord, element: HTMLElement}[] = [];
    private fallSpeed: number = 15; // Reduced from 30 to 15 pixels per second for slower falling
    private maxActivePairs: number = 5; // Fixed at 5 pairs as per requirements
    private spawnedPairsCount: number = 0;
    private matchedPairsCount: number = 0;
    private speedSlider: HTMLInputElement | null = null;
    
    constructor(words: GameWord[], language: string) {
        super(words, language);
        this.gameContainer = document.createElement('div');
        this.gameContainer.className = 'falling-words-container';
        
        // We force itemsPerPage to be 5 for this game
        this.itemsPerPage = 5;
        localStorage.setItem('itemsPerPage', '5');
    }

    updateInstructions() {
        this.setInstructions('לחץ על זוגות של מילים מתאימות לפני שהן פוגעות ברצפה. אם מילה פוגעת ברצפה, המשחק נגמר.');
    }

    render() {
        // Hide regular containers and pagination
        this.wordContainer.style.display = 'none';
        this.translationContainer.style.display = 'none';
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) {
            paginationContainer.style.display = 'none';
        }
        
        // Hide separator
        const separator = document.querySelector('.separator') as HTMLElement;
        if (separator) {
            separator.style.display = 'none';
        }
        
        // Create game container if not already in DOM
        if (!document.body.contains(this.gameContainer)) {
            const gameArea = document.querySelector('.game-area');
            if (gameArea) {
                gameArea.appendChild(this.gameContainer);
            }
        }
        
        // Update instructions
        this.updateInstructions();
        
        // Calculate height to fill remaining screen space
        const gameArea = document.querySelector('.game-area');
        const gameAreaRect = gameArea.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const bottomSpace = 0; // No margin at bottom
        const containerHeight = viewportHeight - gameAreaRect.top - bottomSpace;
        
        // Prepare game container
        this.gameContainer.innerHTML = '';
        this.gameContainer.style.display = 'block';
        this.gameContainer.style.height = `${Math.max(400, containerHeight)}px`; // Use at least 400px or fill screen
        this.gameContainer.style.width = '100%';
        this.gameContainer.style.position = 'relative';
        this.gameContainer.style.overflow = 'hidden';
        this.gameContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'; // Transparent background
        this.gameContainer.style.border = '1px solid #ccc';
        this.gameContainer.style.borderRadius = '5px';
        this.gameContainer.style.margin = '10px 0 0 0'; // Less top margin, no bottom margin
        
        // Create start button
        const startButton = document.createElement('button');
        startButton.textContent = 'התחל משחק';
        startButton.className = 'start-game-btn mobile-optimized';
        startButton.style.position = 'absolute';
        startButton.style.top = '50%';
        startButton.style.left = '50%';
        startButton.style.transform = 'translate(-50%, -50%)';
        startButton.style.padding = '10px 20px';
        startButton.style.fontSize = '18px';
        startButton.style.cursor = 'pointer';
        startButton.style.zIndex = '10';
        startButton.style.touchAction = 'manipulation'; // Standard property
        
        startButton.addEventListener('click', () => {
            this.startGame();
            startButton.style.display = 'none';
        });
        
        this.gameContainer.appendChild(startButton);
        
        // Create speed control slider
        this.createSpeedSlider();
    }
    
    createSpeedSlider() {
        // Remove any existing speed slider containers first
        const existingSliders = document.querySelectorAll('.speed-slider-container');
        existingSliders.forEach(slider => slider.remove());
        
        // Create container for the slider
        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'speed-slider-container';
        
        // Create label
        const sliderLabel = document.createElement('label');
        sliderLabel.textContent = 'מהירות:';
        sliderLabel.className = 'speed-slider-label';
        sliderLabel.htmlFor = 'speedSlider';
        
        // Create the slider
        this.speedSlider = document.createElement('input');
        this.speedSlider.type = 'range';
        this.speedSlider.min = '5';  // Lower minimum speed (much slower)
        this.speedSlider.max = '50'; // Lower maximum speed (slower overall)
        this.speedSlider.value = '15'; // Default slower value
        this.speedSlider.id = 'speedSlider';
        this.speedSlider.className = 'speed-slider';
        
        // Create value display
        const sliderValue = document.createElement('span');
        sliderValue.textContent = this.speedSlider.value;
        sliderValue.className = 'speed-slider-value';
        
        // Add event listener for slider change
        this.speedSlider.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            this.fallSpeed = parseInt(target.value);
            sliderValue.textContent = target.value;
        });
        
        // Append elements to container
        sliderContainer.appendChild(sliderLabel);
        sliderContainer.appendChild(this.speedSlider);
        sliderContainer.appendChild(sliderValue);
        
        // Add slider to DOM - above the game container
        const gameArea = document.querySelector('.game-area');
        gameArea.insertBefore(sliderContainer, this.gameContainer);
    }
    
    renderTarget() {
        // This game doesn't use the traditional target container
    }
    
    startGame() {
        // Reset game state
        this.fallingWords = [];
        this.gameContainer.innerHTML = '';
        this.firstWordSelected = null;
        this.gameRunning = true;
        this.spawnedPairsCount = 0;
        this.matchedPairsCount = 0;
        this.updateScore(0);
        this.failures = 0;
        
        // Update score and failures
        document.getElementById('numFailures').textContent = '0';
        document.getElementById('livesDisplay').textContent = '10';
        
        // Get current speed from slider if it exists
        if (this.speedSlider) {
            this.fallSpeed = parseInt(this.speedSlider.value);
            // No need to explicitly set display:flex since CSS will handle this
        }
        
        // Shuffle the words to get random pairs for each game session
        const shuffledWords = shuffleArray([...this.words]);
        
        // Select the first 5 pairs for this game (respecting itemsPerPage=5)
        this.wordPairs = [];
        for (let i = 0; i < Math.min(this.itemsPerPage, shuffledWords.length); i++) {
            this.wordPairs.push({
                originalWord: shuffledWords[i],
                element: null
            });
        }
        
        // Start the animation loop
        this.lastTimestamp = performance.now();
        this.lastSpawnTime = this.lastTimestamp;
        this.animationLoop(this.lastTimestamp);
    }
    
    animationLoop(timestamp: number) {
        if (!this.gameRunning) return;
        
        const deltaTime = timestamp - this.lastTimestamp;
        this.lastTimestamp = timestamp;
        
        // Update positions of falling words
        this.updateWordPositions(deltaTime);
        
        // Check for collisions with bottom
        this.checkCollisions();
        
        // Spawn new words at intervals if we haven't spawned all pairs yet
        if (timestamp - this.lastSpawnTime > this.spawnInterval && this.spawnedPairsCount < this.wordPairs.length) {
            this.spawnWordPair();
            this.lastSpawnTime = timestamp;
        }
        
        // Continue the animation loop
        this.animationFrameId = requestAnimationFrame(this.animationLoop.bind(this));
    }
    
    updateWordPositions(deltaTime: number) {
        // Move each word downward
        for (const wordElement of this.fallingWords) {
            if (!wordElement.classList.contains('matched')) {
                const currentTop = parseFloat(wordElement.style.top);
                const newTop = currentTop + (this.fallSpeed * deltaTime / 1000);
                wordElement.style.top = `${newTop}px`;
            }
        }
    }
    
    checkCollisions() {
        const containerHeight = this.gameContainer.clientHeight;
        
        for (const wordElement of this.fallingWords) {
            if (wordElement.classList.contains('matched')) continue;
            
            // Get the current position
            const wordTop = parseFloat(wordElement.style.top);
            const wordHeight = wordElement.clientHeight;
            
            // Check if the word has hit the bottom
            if (wordTop + wordHeight > containerHeight) {
                // End the game immediately when any word hits the bottom
                this.endGame(false);
                return; // Exit the function early
            }
        }
    }
    
    spawnWordPair() {
        if (this.spawnedPairsCount >= this.wordPairs.length) return;
        
        const pair = this.wordPairs[this.spawnedPairsCount];
        this.spawnedPairsCount++;
        
        const containerWidth = this.gameContainer.clientWidth;
        const padding = 10; // Padding from container edges
        
        const wordElement = this.createFallingWord(pair.originalWord.text, false);
        const translationElement = this.createFallingWord(pair.originalWord.translation, true);
        
        // Set initial styles for measurement and hide them temporarily
        wordElement.style.position = 'absolute';
        translationElement.style.position = 'absolute';
        wordElement.style.visibility = 'hidden';
        translationElement.style.visibility = 'hidden';

        this.gameContainer.appendChild(wordElement);
        this.gameContainer.appendChild(translationElement);

        const wordWidth = wordElement.offsetWidth;
        const wordHeight = wordElement.offsetHeight;
        const translationWidth = translationElement.offsetWidth;
        const translationHeight = translationElement.offsetHeight;
        
        // Random horizontal position for the original word
        const maxLeftWord = containerWidth - wordWidth - padding;
        const leftWord = padding + Math.random() * Math.max(0, maxLeftWord);
        wordElement.style.left = `${leftWord}px`;

        // Random horizontal position for the translation
        const maxLeftTranslation = containerWidth - translationWidth - padding;
        const leftTranslation = padding + Math.random() * Math.max(0, maxLeftTranslation);
        translationElement.style.left = `${leftTranslation}px`;
        
        // Random initial vertical positions, ensuring they start off-screen, are separated,
        // and their order of appearance is random.
        const initialTopOffset = 20; // Base offset above the screen for the element that starts higher.
        const verticalSeparation = 40; // Minimum vertical gap between the two elements.

        // Determine heights for clarity in calculation
        const h1 = wordHeight; 
        const h2 = translationHeight;

        // Generate two distinct vertical starting positions:
        // y_lower is less negative (closer to the screen top, but still off-screen).
        // y_higher is more negative (further above y_lower).
        let y_lower = -(Math.max(h1, h2) + initialTopOffset + Math.random() * 60); // Ensure the lower one is well off-screen
        let y_higher = y_lower - (Math.min(h1, h2) + verticalSeparation + Math.random() * 40); // Ensure higher is further up and separated

        let finalTopWord: number;
        let finalTopTranslation: number;

        // Randomly assign these generated positions to the word and translation elements
        if (Math.random() < 0.5) {
            finalTopWord = y_lower;          // Word starts at the "lower" (but still off-screen) position
            finalTopTranslation = y_higher;  // Translation starts at the "higher" (further off-screen) position
        } else {
            finalTopWord = y_higher;         // Word starts at the "higher" position
            finalTopTranslation = y_lower;   // Translation starts at the "lower" position
        }

        wordElement.style.top = `${finalTopWord}px`;
        translationElement.style.top = `${finalTopTranslation}px`;

        // Make elements visible again
        wordElement.style.visibility = 'visible';
        translationElement.style.visibility = 'visible';

        this.fallingWords.push(wordElement);
        this.fallingWords.push(translationElement);
        
        pair.element = wordElement; 
        
        wordElement.dataset.matchesText = pair.originalWord.translation;
        translationElement.dataset.matchesText = pair.originalWord.text;
    }
    
    createFallingWord(text: string, isTranslation: boolean): HTMLElement {
        const wordElement = document.createElement('div');
        wordElement.className = isTranslation ? 
            'falling-word translation mobile-optimized' : 
            'falling-word word mobile-optimized';
        wordElement.textContent = text;
        
        // Styles like position, padding, border-radius, cursor, user-select, 
        // z-index, font-size, min-width, min-height, touch-action, will-change
        // will now be handled by CSS rules for .falling-word and its variants.
        
        // Add event listeners for both click and touch
        wordElement.addEventListener('click', () => this.handleWordClick(wordElement));
        wordElement.addEventListener('touchend', (e) => {
            e.preventDefault(); // Prevent default touch behavior
            this.handleWordClick(wordElement);
        }, {passive: false});
        
        return wordElement;
    }
    
    handleWordClick(wordElement: HTMLElement) {
        if (wordElement.classList.contains('matched')) return;
        
        // Highlight the selected word
        wordElement.classList.add('selected');
        
        if (!this.firstWordSelected) {
            // This is the first word selected
            this.firstWordSelected = wordElement;
            return;
        }
        
        // This is the second word - check if it matches the first
        const firstText = this.firstWordSelected.textContent;
        const secondText = wordElement.textContent;
        
        // Check if they match (one is translation of the other)
        const isMatch = 
            (this.firstWordSelected.dataset.matchesText === secondText) || 
            (wordElement.dataset.matchesText === firstText);
        
        if (isMatch) {
            // Match found!
            this.handleMatchedPair(this.firstWordSelected, wordElement);
        } else {
            // No match - deselect both
            this.firstWordSelected.classList.remove('selected');
            wordElement.classList.remove('selected');
            
            // Play error sound
            SoundService.getInstance().playIncorrectSound();
        }
        
        // Reset first selection
        this.firstWordSelected = null;
    }
    
    handleMatchedPair(word1: HTMLElement, word2: HTMLElement) {
        // Mark both as matched
        word1.classList.remove('selected');
        word2.classList.remove('selected');
        word1.classList.add('matched');
        word2.classList.add('matched');
        
        // Animate them to fade out
        word1.style.transition = 'opacity 0.5s, transform 0.5s';
        word2.style.transition = 'opacity 0.5s, transform 0.5s';
        word1.style.opacity = '0';
        word2.style.opacity = '0';
        word1.style.transform = 'scale(0)';
        word2.style.transform = 'scale(0)';
        
        // Play correct sound
        SoundService.getInstance().playCorrectSound();
        
        // Update score
        this.updateScore(this.score + 1);
        this.matchedPairsCount++;
        
        // After animation ends, remove them from the game
        setTimeout(() => {
            if (this.gameContainer.contains(word1)) {
                this.gameContainer.removeChild(word1);
            }
            if (this.gameContainer.contains(word2)) {
                this.gameContainer.removeChild(word2);
            }
            this.fallingWords = this.fallingWords.filter(w => w !== word1 && w !== word2);
            
            // Check if game is complete (all pairs matched)
            if (this.matchedPairsCount >= this.wordPairs.length) {
                this.endGame(true);
            }
        }, 500);
    }
    
    endGame(success: boolean) {
        // Don't re-end the game if it's already ended
        if (!this.gameRunning) return;
        
        // Stop the game loop
        this.gameRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Hide the speed slider
        const sliderContainer = document.querySelector('.speed-slider-container') as HTMLElement;
        if (sliderContainer) {
            sliderContainer.style.display = 'none';
        }
        
        // Keep separator hidden
        const separator = document.querySelector('.separator') as HTMLElement;
        if (separator) {
            separator.style.display = 'none';
        }
        
        // Clear the container and hide it
        this.gameContainer.innerHTML = '';
        this.gameContainer.style.display = 'none';
        
        // Play appropriate sound effects
        if (success) {
            // Show confetti animation for successful game completion
            this.showConfetti();
            SoundService.getInstance().playGameOverSuccessSound();
        } else {
            SoundService.getInstance().playGameOverSound();
        }
        
        // Show summary card
        this.showSummaryCard(success);
        
        // Show new game buttons
        const newGameBtn = document.getElementById('newGameBtn');
        const newGameBtnBottom = document.getElementById('newGameBtnBottom');
        if (newGameBtn) {
            newGameBtn.style.display = 'inline-block';
            newGameBtn.classList.add('blink-once');
        }
        if (newGameBtnBottom) {
            newGameBtnBottom.style.display = 'block';
            newGameBtnBottom.classList.add('blink-once');
        }
    }
    
    // Override the parent class's method to handle this specific game
    updateFailures(newVal: number) {
        super.updateFailures(newVal);
        
        // If lives reach 0, end the game
        if (this.lives <= 0) {
            this.endGame(false);
        }
    }
} 