import { Game } from "./Game.js";
export class PartOfSpeechGame extends Game {
    constructor(words, language) {
        super(words, language);
    }
    updateInstructions() {
        this.setInstructions('יש לגרור כל מילה לחלק המשפט המתאים.');
    }
    loadPartsOfSpeech() {
        // Reset translation elements
        this.translationElements = [];
        this.translationContainer.innerHTML = ''; // Clear previous content
        // Create a map for part of speech to matching words
        const partOfSpeechMap = new Map();
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
    }
    renderTarget() {
        this.loadPartsOfSpeech();
        // Organize translations across pages before showing any page
        if (this.translationElements.length > 0) {
            this.organizeWordsByPage();
            this.updatePage(0);
        }
    }
    // Disable the word organization that tries to match translations with words
    organizeWordsByPage() {
        // Skip the parent class implementation which tries to match words with translations
        // Instead, just divide the already-shuffled words and translations into pages
        const totalPages = Math.ceil(this.wordElements.length / this.itemsPerPage);
        const organizedWords = Array(totalPages).fill(null).map(() => []);
        const organizedTranslations = Array(totalPages).fill(null).map(() => []);
        // Distribute words to pages (already shuffled)
        for (let i = 0; i < this.wordElements.length; i++) {
            const pageIndex = Math.floor(i / this.itemsPerPage);
            if (pageIndex < totalPages) {
                organizedWords[pageIndex].push(this.wordElements[i]);
            }
        }
        // Distribute translations to pages, ensuring each page gets at least one if possible
        let t = 0;
        for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
            if (t < this.translationElements.length) {
                organizedTranslations[pageIndex].push(this.translationElements[t]);
                t++;
            }
        }
        // If more translations, distribute the rest round-robin
        while (t < this.translationElements.length) {
            organizedTranslations[t % totalPages].push(this.translationElements[t]);
            t++;
        }
        // Update the arrays with pages maintained but not matched
        this.wordElements = organizedWords.flat();
        this.translationElements = organizedTranslations.flat();
    }
}
