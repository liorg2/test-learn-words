import { Game } from "./Game.js";
import { shuffleArray } from "../utilities.js";
import { log } from "../utilities.js";
export class TranslationGame extends Game {
    constructor(words, language) {
        super(words, language);
    }
    updateInstructions() {
        this.setInstructions('יש לגרור כל מילה אל התרגום שלה.');
    }
    loadTranslations() {
        this.translationContainer.innerHTML = ''; // Clear previous content
        this.translationElements = []; // Reset translations array
        // Create translations for each word - maintaining the connection
        this.words.forEach(word => {
            const translationDiv = this.renderTranslationDiv(word);
            // Store the word text as a data attribute for matching
            translationDiv.dataset.matchesWord = word.text;
            this.translationElements.push(translationDiv);
        });
    }
    // Reorganize to ensure each page has matching words and translations
    organizeWordsByPage() {
        // Create an array of word-translation pairs to keep matching pairs together
        const pairs = [];
        // First collect all the word divs and find their matching translations
        for (const wordElement of this.wordElements) {
            const wordText = wordElement.textContent;
            // Find matching translation by the matchesWord attribute
            const matchingTranslation = this.translationElements.find(t => t.dataset.matchesWord === wordText);
            if (matchingTranslation) {
                pairs.push({
                    word: wordElement,
                    translation: matchingTranslation
                });
            }
            else {
                log(`Warning: No matching translation found for "${wordText}"`);
            }
        }
        // Shuffle the pairs to randomize order while keeping matches together
        const shuffledPairs = shuffleArray([...pairs]);
        // Calculate how many pairs per page
        const pairsPerPage = this.itemsPerPage;
        const totalPages = Math.ceil(shuffledPairs.length / pairsPerPage);
        // Create arrays for organized words and translations
        const organizedWords = Array(totalPages).fill(null).map(() => []);
        const organizedTranslations = Array(totalPages).fill(null).map(() => []);
        // Group pairs by page first
        for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
            // Get pairs for this page
            const pairsForThisPage = shuffledPairs.slice(pageIndex * pairsPerPage, Math.min((pageIndex + 1) * pairsPerPage, shuffledPairs.length));
            // Add words in order
            pairsForThisPage.forEach(pair => {
                organizedWords[pageIndex].push(pair.word);
            });
            // Collect translations and shuffle them within this page only
            const translationsForThisPage = pairsForThisPage.map(pair => pair.translation);
            const shuffledPageTranslations = shuffleArray([...translationsForThisPage]);
            // Add the shuffled translations
            shuffledPageTranslations.forEach(translation => {
                organizedTranslations[pageIndex].push(translation);
            });
        }
        // Flatten and update the elements arrays
        this.wordElements = organizedWords.flat();
        this.translationElements = organizedTranslations.flat();
        log(`Organized ${this.wordElements.length} words and ${this.translationElements.length} translations into ${totalPages} pages`);
    }
    sortTranslations(words) {
        // Determine the correct language for sorting
        if (this.language === 'he') {
            return words.sort((a, b) => a.text.localeCompare(b.text, 'he'));
        }
        else {
            return words.sort((a, b) => a.translation.localeCompare(b.translation, 'he'));
        }
    }
    renderTranslationDiv(word) {
        const targetDiv = document.createElement('div');
        targetDiv.className = 'translation';
        // Display the correct text based on language
        // For English/French/etc. we show Hebrew translations
        // For Hebrew, we show English/French/etc. text
        if (this.language === 'he') {
            targetDiv.textContent = word.translation;
            targetDiv.dataset.matchesWord = word.text;
        }
        else {
            targetDiv.textContent = word.translation;
            targetDiv.dataset.matchesWord = word.text;
        }
        targetDiv.addEventListener('dragover', this.handleDragOver);
        targetDiv.addEventListener('dragleave', this.handleDragLeave);
        targetDiv.addEventListener('drop', this.handleDrop);
        return targetDiv;
    }
    renderTarget() {
        this.loadTranslations();
        this.organizeWordsByPage(); // Ensure translations are organized before showing any page
        // Show first page after loading translations
        if (this.translationElements.length > 0) {
            this.updatePage(0);
        }
        // Calculate and store total pages based on word count
        const totalPages = Math.ceil(this.words.length / this.itemsPerPage);
        // Always use the maximum value to prevent losing pages
        this.totalPagesCount = Math.max(this.totalPagesCount, totalPages);
        log(`TranslationGame renderTarget: ${this.words.length} words, ${this.itemsPerPage} per page = ${totalPages} pages. Stored total: ${this.totalPagesCount}`);
        // Update pagination UI to show all potential pages
        this.updatePaginationUI();
    }
}
