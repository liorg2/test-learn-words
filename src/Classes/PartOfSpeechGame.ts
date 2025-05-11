import {Game} from "./Game.js";
import {GameWord} from "../globalTypes";
import {log} from "../utilities.js";

export class PartOfSpeechGame extends Game {
    constructor(words: GameWord[], language: string) {
        super(words, language);
    }

    updateInstructions() {
        this.setInstructions('יש לגרור כל מילה לחלק המשפט המתאים.');
    }

    // Create part of speech container elements - similar to loadTranslations in TranslationGame
    loadPartsOfSpeech() {
        // Reset translation elements
        this.translationElements = [];
        this.translationContainer.innerHTML = ''; // Clear previous content
        
        // Create a map for part of speech to matching words
        const partOfSpeechMap = new Map<string, GameWord[]>();
        
        // Group words by their part of speech
        this.words.forEach(word => {
            if (!partOfSpeechMap.has(word.partOfSpeech)) {
                partOfSpeechMap.set(word.partOfSpeech, []);
            }
            partOfSpeechMap.get(word.partOfSpeech).push(word);
        });
        
        // Create translation divs for each part of speech
        partOfSpeechMap.forEach((matchingWords, partOfSpeech) => {
            const targetDiv = document.createElement('div');
            targetDiv.textContent = partOfSpeech;
            targetDiv.className = 'translation';
            
            // Store matching words as a data attribute for organization
            targetDiv.dataset.matchesWords = matchingWords.map(w => w.text).join(',');
            
            targetDiv.addEventListener('dragover', this.handleDragOver);
            targetDiv.addEventListener('dragleave', this.handleDragLeave);
            targetDiv.addEventListener('drop', this.handleDrop);
            this.translationElements.push(targetDiv);
        });

        log(`Parts of speech loaded: ${this.translationElements.length}`);
    }

    // Handle specific organization for PartOfSpeechGame
    organizeWordsByPage() {
        const totalPages = Math.ceil(this.wordElements.length / this.itemsPerPage);
        const wordElements = [...this.wordElements];
        const translationElements = [...this.translationElements];

        // Create arrays for pages
        const organizedWords = Array(totalPages).fill(null).map(() => []);
        const organizedTranslations = Array(totalPages).fill(null).map(() => []);

        // Distribute words to pages
        for (let i = 0; i < wordElements.length; i++) {
            const pageIndex = Math.floor(i / this.itemsPerPage);
            if (pageIndex < totalPages) {
                organizedWords[pageIndex].push(wordElements[i]);
            }
        }

        // Add ALL parts of speech to EACH page
        for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
            // Add each part of speech to this page
            translationElements.forEach(translation => {
                // Create a clone to avoid issues with the same element being added multiple times
                const clonedTranslation = translation.cloneNode(true) as HTMLElement;

                // Add all event listeners to the clone
                clonedTranslation.addEventListener('dragover', this.handleDragOver);
                clonedTranslation.addEventListener('dragleave', this.handleDragLeave);
                clonedTranslation.addEventListener('drop', this.handleDrop);

                organizedTranslations[pageIndex].push(clonedTranslation);
            });
        }

        // Update the arrays
        this.wordElements = organizedWords.flat();
        this.translationElements = organizedTranslations.flat();

        log(`PartOfSpeechGame organized: ${this.wordElements.length} words, ${this.translationElements.length} translations`);
    }

    renderTarget() {
        // Load parts of speech
        this.loadPartsOfSpeech();

        // Only organize and update if we have translations
        if (this.translationElements.length > 0) {
            // Organize all words and translations by page
            this.organizeWordsByPage();

            // Show the first page
            this.updatePage(0);
        }
    }
}