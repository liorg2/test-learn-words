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
    private spawnInterval: number = 400; // Reduced from 2000ms to 400ms for faster spawning
    private lastSpawnTime: number = 0;
    private gameRunning: boolean = false;
    private firstWordSelected: HTMLElement | null = null;
    private wordPairs: {originalWord: GameWord, element: HTMLElement}[] = [];
    private fallSpeed: number = 40; // pixels per second
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
        const bottomSpace = 20; // Small margin at bottom
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
        this.gameContainer.style.margin = '20px 0 0 0'; // Remove bottom margin
        
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
        this.speedSlider.min = '20';  // Minimum speed (slower)
        this.speedSlider.max = '100'; // Maximum speed (faster)
        this.speedSlider.value = '40'; // Default value
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
            // Show the slider during gameplay
            const sliderContainer = document.querySelector('.speed-slider-container') as HTMLElement;
            if (sliderContainer) {
                sliderContainer.style.display = 'flex';
            }
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
        
        // Get the next word pair
        const pair = this.wordPairs[this.spawnedPairsCount];
        this.spawnedPairsCount++;
        
        // Determine horizontal positions - space them out horizontally but not too far
        const containerWidth = this.gameContainer.clientWidth;
        const wordWidth = Math.max(pair.originalWord.text.length, pair.originalWord.translation.length) * 10 + 40;
        
        // Create original word element
        const wordElement = this.createFallingWord(pair.originalWord.text);
        
        // Create translation element - with slightly offset position
        const translationElement = this.createFallingWord(pair.originalWord.translation);
        
        // Ensure words don't spawn too close to each other horizontally
        const leftSide = containerWidth * 0.1;                       // 10% from left
        const rightSide = containerWidth * 0.9 - wordWidth;          // 10% from right
        
        // Random positions across the full width - ensure they're not vertically aligned
        let pos1 = leftSide + Math.random() * (containerWidth * 0.4 - wordWidth);
        let pos2 = containerWidth * 0.5 + Math.random() * (rightSide - containerWidth * 0.5);
        
        // Ensure the positions are not too close vertically
        if (Math.abs(pos1 - pos2) < wordWidth) {
            // Adjust to ensure minimum horizontal separation
            if (pos1 < containerWidth / 2) {
                pos1 = Math.max(leftSide, pos1 - wordWidth/2);
                pos2 = Math.min(rightSide, pos2 + wordWidth/2);
            } else {
                pos1 = Math.min(containerWidth / 2 - wordWidth, pos1 + wordWidth/2);
                pos2 = Math.max(containerWidth / 2, pos2 - wordWidth/2);
            }
        }
        
        // Set positions with different sides of the container
        wordElement.style.left = `${pos1}px`;
        translationElement.style.left = `${pos2}px`;
        
        // Start them at different heights but both visible in the top portion
        const containerHeight = this.gameContainer.clientHeight;
        const topPosition = containerHeight * 0.1; // Position them 10% from the top
        wordElement.style.top = `${topPosition + Math.random() * 20}px`; // Slight random variation
        translationElement.style.top = `${topPosition + Math.random() * 20}px`; // Independent variation
        
        // Add to game
        this.gameContainer.appendChild(wordElement);
        this.gameContainer.appendChild(translationElement);
        this.fallingWords.push(wordElement);
        this.fallingWords.push(translationElement);
        
        // Store reference to the elements
        pair.element = wordElement;
        
        // Make sure each element knows what it matches
        wordElement.dataset.matchesText = pair.originalWord.translation;
        translationElement.dataset.matchesText = pair.originalWord.text;
    }
    
    createFallingWord(text: string): HTMLElement {
        const wordElement = document.createElement('div');
        wordElement.className = 'falling-word mobile-optimized';
        wordElement.textContent = text;
        
        // Position is set by spawnWordPair method
        wordElement.style.position = 'absolute';
        wordElement.style.padding = '10px';
        wordElement.style.backgroundColor = '#ffffff';
        wordElement.style.border = '1px solid #ccc';
        wordElement.style.borderRadius = '5px';
        wordElement.style.cursor = 'pointer';
        wordElement.style.userSelect = 'none';
        wordElement.style.zIndex = '5';
        wordElement.style.fontSize = '17px'; // Consistent font size
        
        // Mobile optimizations - apply directly as a class
        wordElement.style.touchAction = 'none'; // Standard property
        wordElement.style.willChange = 'transform, opacity'; // Standard property
        
        // Add click/touch handler with larger touch target
        wordElement.style.minWidth = '40px'; // Minimum width for better tapping
        wordElement.style.minHeight = '40px'; // Minimum height for better tapping
        
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