import {Game} from "./Game.js";
import {log} from "../utilities.js";
import {GameWord} from "../globalTypes";
import {SoundService} from "../Services/SoundService.js";

interface Position {
    x: number;
    y: number;
    direction: 'horizontal' | 'vertical' | 'diagonal-right' | 'diagonal-left';
}

interface PlacedWord {
    word: string;
    translation: string;
    position: Position;
    letterCells: HTMLElement[];
    found: boolean;
}

export class WordSearchGame extends Game {
    wordSearchGrid: HTMLElement[][] = [];
    gridSize = 10; // Reduced grid size from 15 to 10
    placedWords: PlacedWord[] = [];
    cellSize = 40; // Slightly larger cells for better readability
    selectedCells: HTMLElement[] = [];
    currentSelection = false;
    
    constructor(words: GameWord[], language: string) {
        super(words, language);
        // Limit to a reasonable number of words to avoid overcrowding
        this.words = this.words.slice(0, 8); // Reduced from 12 to 8 words
    }

    updateInstructions() {
        this.setInstructions('מצא את המילים המוסתרות בתשבץ. לחץ על האות הראשונה וגרור עד לאות האחרונה.');
    }

    render() {
        // Call parent's render method but override pagination behavior
        super.render();
        
        // Hide pagination container completely
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) {
            paginationContainer.style.display = 'none';
        }
    }

    renderTarget() {
        this.translationContainer.innerHTML = '';
        
        // Create a container for the word search grid
        const gridContainer = document.createElement('div');
        gridContainer.className = 'word-search-grid';
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateColumns = `repeat(${this.gridSize}, ${this.cellSize}px)`;
        gridContainer.style.gridTemplateRows = `repeat(${this.gridSize}, ${this.cellSize}px)`;
        gridContainer.style.gap = '1px';
        
        // Initialize the word search grid with empty cells
        this.initializeGrid(gridContainer);
        
        // Try to place words in the grid
        this.generateWordSearch();
        
        // Add the grid to the target container
        this.translationContainer.appendChild(gridContainer);
        
        // Render the word clouds in the top container
        this.renderWordContainer();
    }
    
    // Display the words as interactive "clouds" at the top using the nicer bottom styling
    renderWordContainer() {
        this.wordContainer.innerHTML = '';
        
        // Create a styled container for the word list
        const wordsContainer = document.createElement('div');
        wordsContainer.className = 'word-list-container';
        // wordsContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        // wordsContainer.style.padding = '10px 20px';
        // wordsContainer.style.borderRadius = '5px';
        // wordsContainer.style.margin = '10px auto';
        // wordsContainer.style.width = '90%';
        // wordsContainer.style.direction = 'rtl';
        // wordsContainer.style.textAlign = 'right';
        // wordsContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';
        
        // Add a title for the words list
        const wordsTitle = document.createElement('h3');
        wordsTitle.textContent = 'מילים לחיפוש:';
        wordsTitle.style.marginBottom = '10px';
        wordsTitle.style.color = '#333';
        wordsTitle.style.textAlign = 'center';
        wordsContainer.appendChild(wordsTitle);
        
        // Create the words list with visual elements
        const wordsList = document.createElement('ul');
        wordsList.className = 'words-list';
        wordsList.style.listStyleType = 'none';
        wordsList.style.padding = '0';
        wordsList.style.margin = '0';
        wordsList.style.display = 'flex';
        wordsList.style.flexWrap = 'wrap';
        wordsList.style.gap = '10px';
        wordsList.style.justifyContent = 'center';
        
        // Add each word as a styled list item
        this.placedWords.forEach((placedWord) => {
            const wordItem = document.createElement('li');
            wordItem.dataset.word = placedWord.word;
            wordItem.textContent = `${placedWord.word} - ${placedWord.translation}`;
            wordItem.classList.add('word');
            // wordItem.style.padding = '5px 10px';
            // wordItem.style.backgroundColor = '#f0f0f0';
            // wordItem.style.borderRadius = '20px';
            // wordItem.style.border = '1px solid #ccc';
            // wordItem.style.transition = 'all 0.3s ease';
            
            wordsList.appendChild(wordItem);
        });
        
        wordsContainer.appendChild(wordsList);
        this.wordContainer.appendChild(wordsContainer);
    }
    
    initializeGrid(gridContainer: HTMLElement) {
        this.wordSearchGrid = [];
        
        for (let y = 0; y < this.gridSize; y++) {
            const row: HTMLElement[] = [];
            for (let x = 0; x < this.gridSize; x++) {
                const cell = document.createElement('div');
                cell.className = 'word-search-cell empty';
                cell.style.width = `${this.cellSize}px`;
                cell.style.height = `${this.cellSize}px`;
                cell.dataset.x = x.toString();
                cell.dataset.y = y.toString();
                
                // Add mouse event listeners for selection
                cell.addEventListener('mousedown', this.handleCellMouseDown.bind(this));
                cell.addEventListener('mouseover', this.handleCellMouseOver.bind(this));
                cell.addEventListener('mouseup', this.handleCellMouseUp.bind(this));
                
                // Add touch event listeners for mobile
                cell.addEventListener('touchstart', this.handleCellTouchStart.bind(this));
                cell.addEventListener('touchmove', this.handleCellTouchMove.bind(this));
                cell.addEventListener('touchend', this.handleCellTouchEnd.bind(this));
                
                // Prevent text selection while dragging
                cell.addEventListener('selectstart', (e) => e.preventDefault());
                
                gridContainer.appendChild(cell);
                row.push(cell);
            }
            this.wordSearchGrid.push(row);
        }
        
        // Add document-level event listener to handle case when mouse is released outside the grid
        document.addEventListener('mouseup', this.handleDocumentMouseUp.bind(this));
        document.addEventListener('touchend', this.handleDocumentTouchEnd.bind(this));
    }
    
    generateWordSearch() {
        this.placedWords = [];
        const maxAttempts = 100;
        const directions = ['horizontal', 'vertical', 'diagonal-right', 'diagonal-left'];
        
        // Try to place each word
        for (let i = 0; i < this.words.length; i++) {
            const word = this.words[i];
            let placed = false;
            let attempts = 0;
            
            // Skip words that are too long for the grid
            if (word.text.length > this.gridSize) {
                log(`Word "${word.text}" is too long for the grid size of ${this.gridSize}. Skipping.`);
                continue;
            }
            
            while (!placed && attempts < maxAttempts) {
                attempts++;
                
                // Choose random direction
                const direction = directions[Math.floor(Math.random() * directions.length)] as 'horizontal' | 'vertical' | 'diagonal-right' | 'diagonal-left';
                
                // Choose random starting position
                let startX, startY;
                
                if (direction === 'horizontal') {
                    startX = Math.floor(Math.random() * (this.gridSize - word.text.length));
                    startY = Math.floor(Math.random() * this.gridSize);
                } else if (direction === 'vertical') {
                    startX = Math.floor(Math.random() * this.gridSize);
                    startY = Math.floor(Math.random() * (this.gridSize - word.text.length));
                } else if (direction === 'diagonal-right') {
                    startX = Math.floor(Math.random() * (this.gridSize - word.text.length));
                    startY = Math.floor(Math.random() * (this.gridSize - word.text.length));
                } else { // diagonal-left
                    startX = Math.floor(Math.random() * (this.gridSize - word.text.length)) + word.text.length - 1;
                    startY = Math.floor(Math.random() * (this.gridSize - word.text.length));
                }
                
                // Check if we can place the word here
                if (this.canPlaceWordAt(word.text, startX, startY, direction)) {
                    this.placeWordAt(word.text, word.translation, startX, startY, direction);
                    placed = true;
                }
            }
            
            // If we couldn't place the word after multiple attempts, just skip it
            if (!placed) {
                log(`Couldn't place word: ${word.text}`);
            }
        }
        
        // Fill the remaining cells with random letters
        this.fillEmptyCells();
    }
    
    canPlaceWordAt(word: string, startX: number, startY: number, direction: 'horizontal' | 'vertical' | 'diagonal-right' | 'diagonal-left'): boolean {
        // Check if the word would go out of bounds
        if (direction === 'horizontal' && startX + word.length > this.gridSize) {
            return false;
        } else if (direction === 'vertical' && startY + word.length > this.gridSize) {
            return false;
        } else if (direction === 'diagonal-right' && (startX + word.length > this.gridSize || startY + word.length > this.gridSize)) {
            return false;
        } else if (direction === 'diagonal-left' && (startX - word.length < -1 || startY + word.length > this.gridSize)) {
            return false;
        }
        
        // Check if cells are empty or have matching letters
        for (let i = 0; i < word.length; i++) {
            let x, y;
            
            if (direction === 'horizontal') {
                x = startX + i;
                y = startY;
            } else if (direction === 'vertical') {
                x = startX;
                y = startY + i;
            } else if (direction === 'diagonal-right') {
                x = startX + i;
                y = startY + i;
            } else { // diagonal-left
                x = startX - i;
                y = startY + i;
            }
            
            // Safety check to ensure we don't access outside the array bounds
            if (y < 0 || y >= this.gridSize || x < 0 || x >= this.gridSize) {
                return false;
            }
            
            const cell = this.wordSearchGrid[y][x];
            const cellLetter = cell.textContent;
            
            // Cell must be empty or have the same letter
            if (cellLetter && cellLetter !== word[i]) {
                return false;
            }
        }
        
        return true;
    }
    
    placeWordAt(word: string, translation: string, startX: number, startY: number, direction: 'horizontal' | 'vertical' | 'diagonal-right' | 'diagonal-left') {
        const letterCells: HTMLElement[] = [];
        
        for (let i = 0; i < word.length; i++) {
            let x, y;
            
            if (direction === 'horizontal') {
                x = startX + i;
                y = startY;
            } else if (direction === 'vertical') {
                x = startX;
                y = startY + i;
            } else if (direction === 'diagonal-right') {
                x = startX + i;
                y = startY + i;
            } else { // diagonal-left
                x = startX - i;
                y = startY + i;
            }
            
            const cell = this.wordSearchGrid[y][x];
            cell.classList.remove('empty');
            cell.classList.add('letter-cell');
            
            // Use lowercase letter
            cell.textContent = word[i].toLowerCase();
            
            // Store words and positions in data attributes for selection verification
            if (!cell.dataset.words) {
                cell.dataset.words = '';
            }
            cell.dataset.words += `${word}:${i},`;
            
            letterCells.push(cell);
        }
        
        // Store information about the placed word
        this.placedWords.push({
            word,
            translation,
            position: { x: startX, y: startY, direction },
            letterCells,
            found: false
        });
    }
    
    fillEmptyCells() {
        // Use language-appropriate letters for filling the grid
        let letters;
        if (this.language === 'he') {
            // Hebrew letters
            letters = 'אבגדהוזחטיכלמנסעפצקרשת';
        } else if (this.language === 'fr') {
            // French letters - in lowercase
            letters = 'abcdefghijklmnopqrstuvwxyzàâçéèêëîïôùûüÿ';
        } else {
            // Default to English letters - in lowercase
            letters = 'abcdefghijklmnopqrstuvwxyz';
        }
        
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = this.wordSearchGrid[y][x];
                if (!cell.textContent) {
                    cell.textContent = letters.charAt(Math.floor(Math.random() * letters.length));
                }
            }
        }
    }
    
    handleCellMouseDown(event: MouseEvent) {
        const cell = event.target as HTMLElement;
        this.currentSelection = true;
        this.selectedCells = [cell];
        cell.classList.add('selected');
    }
    
    handleCellMouseOver(event: MouseEvent) {
        if (!this.currentSelection) return;
        
        const cell = event.target as HTMLElement;
        
        // Check if this is a valid next cell (straight line from first cell)
        if (this.isValidNextCell(cell)) {
            // Remove all selections after the first cell
            while (this.selectedCells.length > 1) {
                const cellToRemove = this.selectedCells.pop();
                cellToRemove.classList.remove('selected');
            }
            
            // Add all cells in the line between first selected and current
            const firstCell = this.selectedCells[0];
            const cellsBetween = this.getCellsBetween(firstCell, cell);
            
            for (const betweenCell of cellsBetween) {
                if (!this.selectedCells.includes(betweenCell)) {
                    this.selectedCells.push(betweenCell);
                    betweenCell.classList.add('selected');
                }
            }
            
            // Add the current cell if not already added
            if (!this.selectedCells.includes(cell)) {
                this.selectedCells.push(cell);
                cell.classList.add('selected');
            }
        }
    }
    
    handleCellMouseUp(event: MouseEvent) {
        this.checkSelectedWord();
        this.resetSelection();
    }
    
    handleDocumentMouseUp() {
        if (this.currentSelection) {
            this.checkSelectedWord();
            this.resetSelection();
        }
    }
    
    isValidNextCell(cell: HTMLElement): boolean {
        if (this.selectedCells.length === 0) return true;
        
        const firstCell = this.selectedCells[0];
        const firstX = parseInt(firstCell.dataset.x);
        const firstY = parseInt(firstCell.dataset.y);
        const currentX = parseInt(cell.dataset.x);
        const currentY = parseInt(cell.dataset.y);
        
        // Check if it forms a straight line (horizontal, vertical, or diagonal)
        const dx = Math.abs(currentX - firstX);
        const dy = Math.abs(currentY - firstY);
        
        return (dx === 0 || dy === 0 || dx === dy);
    }
    
    getCellsBetween(firstCell: HTMLElement, lastCell: HTMLElement): HTMLElement[] {
        const cells: HTMLElement[] = [];
        const firstX = parseInt(firstCell.dataset.x);
        const firstY = parseInt(firstCell.dataset.y);
        const lastX = parseInt(lastCell.dataset.x);
        const lastY = parseInt(lastCell.dataset.y);
        
        // Calculate direction vector
        const dx = Math.sign(lastX - firstX);
        const dy = Math.sign(lastY - firstY);
        
        // Calculate number of steps needed
        const steps = Math.max(Math.abs(lastX - firstX), Math.abs(lastY - firstY));
        
        // Get all cells between first and last
        for (let i = 1; i < steps; i++) {
            const x = firstX + (i * dx);
            const y = firstY + (i * dy);
            cells.push(this.wordSearchGrid[y][x]);
        }
        
        return cells;
    }
    
    checkSelectedWord() {
        if (this.selectedCells.length < 2) return;
        
        // Collect the letters from selected cells
        const selectedWord = this.selectedCells.map(cell => cell.textContent).join('');
        const reversedWord = selectedWord.split('').reverse().join('');
        
        // Check if this matches any of our words
        let foundWord = null;
        for (const placedWord of this.placedWords) {
            // Case insensitive comparison since we're using lowercase in the grid
            const placedWordLower = placedWord.word.toLowerCase();
            if ((placedWordLower === selectedWord || placedWordLower === reversedWord) && !placedWord.found) {
                foundWord = placedWord;
                break;
            }
        }
        
        if (foundWord) {
            // Mark the word as found
            foundWord.found = true;
            
            // Mark cells as found
            for (const cell of this.selectedCells) {
                cell.classList.add('found');
            }
            
            // Mark the word list item as found
            const wordItem = document.querySelector(`li[data-word="${foundWord.word}"]`) as HTMLElement;
            if (wordItem) {
                wordItem.style.backgroundColor = '#4caf50';
                wordItem.style.color = 'white';
                wordItem.style.textDecoration = 'line-through';
                wordItem.style.opacity = '0.7';
            }
            
            // Play correct sound
            SoundService.getInstance().playCorrectSound();
            
            // Update score
            this.updateScore(this.placedWords.filter(word => word.found).length);
            
            // Check if all words are found
            if (this.placedWords.every(word => word.found)) {
                this.showConfetti();
            }
        } else {
            // Play incorrect sound if the word is long enough to be a reasonable attempt
            if (this.selectedCells.length >= 3) {
                SoundService.getInstance().playIncorrectSound();
                this.updateFailures(this.failures + 1);
            }
        }
        
        // Reset selection after checking
        this.resetSelection();
    }
    
    resetSelection() {
        this.currentSelection = false;
        for (const cell of this.selectedCells) {
            cell.classList.remove('selected');
        }
        this.selectedCells = [];
    }

    handleCellTouchStart(event: TouchEvent) {
        event.preventDefault(); // Prevent scrolling
        const touch = event.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
        
        if (element && element.classList.contains('word-search-cell')) {
            this.currentSelection = true;
            this.selectedCells = [element];
            element.classList.add('selected');
        }
    }

    handleCellTouchMove(event: TouchEvent) {
        event.preventDefault(); // Prevent scrolling
        if (!this.currentSelection) return;
        
        const touch = event.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
        
        if (element && element.classList.contains('word-search-cell') && this.isValidNextCell(element)) {
            // Remove all selections after the first cell
            while (this.selectedCells.length > 1) {
                const cellToRemove = this.selectedCells.pop();
                cellToRemove.classList.remove('selected');
            }
            
            // Add all cells in the line between first selected and current
            const firstCell = this.selectedCells[0];
            const cellsBetween = this.getCellsBetween(firstCell, element);
            
            for (const betweenCell of cellsBetween) {
                if (!this.selectedCells.includes(betweenCell)) {
                    this.selectedCells.push(betweenCell);
                    betweenCell.classList.add('selected');
                }
            }
            
            // Add the current cell if not already added
            if (!this.selectedCells.includes(element)) {
                this.selectedCells.push(element);
                element.classList.add('selected');
            }
        }
    }

    handleCellTouchEnd(event: TouchEvent) {
        event.preventDefault(); // Prevent default behavior
        this.checkSelectedWord();
        this.resetSelection();
    }

    handleDocumentTouchEnd() {
        if (this.currentSelection) {
            this.checkSelectedWord();
            this.resetSelection();
        }
    }

    // Override pagination controls to disable them for WordSearch
    renderPaginationControls() {
        // Do nothing - no pagination for word search
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) {
            paginationContainer.style.display = 'none';
        }
    }

    // Override update page to prevent pagination in word search
    updatePage(pageNum: number) {
        // No pagination needed for word search
    }

    // Override is page empty check
    isPageEmpty(pageNum: number): boolean {
        return false; 
    }

    // Override check page completion
    checkPageCompletion(pageNum: number) {
        // No pagination in word search
    }

    // Override move to next page
    moveToNextUncompletedPage() {
        // No pagination in word search
    }

    // Override check all pages completed
    checkAllPagesCompleted() {
        // Instead check if all words are found
        const allWordsFound = this.placedWords.every(word => word.found);
        if (allWordsFound) {
            this.updateScore(this.words.length);
        }
    }

    // Override organizeWordsByPage to prevent matching words and translations
    organizeWordsByPage() {
        // For WordSearch, we don't organize words - we just keep them randomly arranged
        // This override prevents the parent class's organization logic
    }
}