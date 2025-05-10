import { Game } from "./Game.js";
import { log } from "../utilities.js";
import { GameWord } from "../globalTypes";
//lior

export class MissingWordGame extends Game {
    constructor(words: GameWord[], language: string) {
        super(words, language);
    }

    updateInstructions() {
        this.setInstructions('יש לגרור את המילה המתאימה למקום החסר.');
    }

    loadSentences() {
        // Reset the translation elements
        this.translationElements = [];
        this.translationContainer.innerHTML = ''; // Clear previous content

        const randomSentence = this.getRandomWordAndModifiedSentence();
        if (!randomSentence) return;

        const targetDiv = document.createElement('div');
        targetDiv.innerHTML = `<strong class="missing-word-hebrew">${randomSentence.translation}</strong><br/><br/>${randomSentence.modifiedSentence}`;
        targetDiv.className = 'translation ltr';
        targetDiv.addEventListener('dragover', this.handleDragOver);
        targetDiv.addEventListener('dragleave', this.handleDragLeave);
        targetDiv.addEventListener('drop', this.handleDrop);
        targetDiv.dataset.selectedWord = randomSentence.selectedWord;
        this.translationElements.push(targetDiv);
    }

    getRandomWordAndModifiedSentence() {
        // Select a random word object
        const displayedWords = Array.from(document.querySelectorAll('.word'))
            .filter(element => (element as HTMLElement).offsetParent !== null && !element.classList.contains('correct'))
            .map(element => element.textContent);
        log('displayedWords ' + displayedWords.join(","));
        // Filter the words array to include only those that are displayed
        const filteredWords = this.words.filter(word => displayedWords.includes(word.text));

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
        const translation = selectedWord.sentences[randomSentenceIndex].to;

        // Replace the word in the sentence with underscores
        const modifiedSentence = selectedSentence.replace(new RegExp(`(?<!\\w)${selectedWord.text}(s|[.,!?])?(?!\\w)`, 'gi'), "________");

        log('getRandomWordAndModifiedSentence ' + selectedWord.text + ' ' + modifiedSentence + ' ' + selectedSentence);
        return { selectedWord: selectedWord.text, modifiedSentence, selectedSentence, translation };
    }

    renderTarget() {
        this.loadSentences();
        
        // Organize translations across pages before showing any page
        if (this.translationElements.length > 0) {
            this.organizeWordsByPage();
            this.updatePage(0);
        }
    }

    // Override the Game class's method to handle target updates properly
    checkPageCompletion(pageNum: number) {
        // First run the parent implementation
        super.checkPageCompletion(pageNum);

        // For Missing Word Game, if it's a new random sentence after a correct answer,
        // we also need to check if there are any matching words for this sentence
        if (this.currentPage === pageNum) {
            // Get the current sentence
            const sentenceElement = this.translationContainer.querySelector('.translation') as HTMLElement;
            if (sentenceElement && sentenceElement.dataset.selectedWord) {
                // Get the selected word
                const selectedWord = sentenceElement.dataset.selectedWord;

                // Check if there's a matching visible word
                const hasMatchingWord = Array.from(this.wordContainer.querySelectorAll('.word'))
                    .some(wordEl => {
                        const element = wordEl as HTMLElement;
                        return element.textContent === selectedWord &&
                            !element.classList.contains('correct') &&
                            element.style.display !== 'none';
                    });

                // If there's no matching word for this sentence, generate a new one
                if (!hasMatchingWord) {
                    this.loadSentences();
                    // Show the same page again
                    this.updatePage(this.currentPage);
                    // Re-check completion
                    setTimeout(() => this.checkPageCompletion(this.currentPage), 100);
                }
            }
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
        this.wordElements = organizedWords.flat();
        this.translationElements = organizedTranslations.flat();
    }
}