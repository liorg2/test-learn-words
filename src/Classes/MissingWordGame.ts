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

    // Create a sentence for each displayed word
    loadSentences() {
        // Reset translation elements
        this.translationElements = [];
        this.translationContainer.innerHTML = ''; // Clear previous content

        // Create sentences for every word to ensure all pages have sentences
        const wordsWithSentences = this.words.filter(word => word.sentences && word.sentences.length > 0);

        // Only proceed if we have words with sentences
        if (wordsWithSentences.length === 0) {
            log('No words with sentences found');
            return;
        }

        // Create a sentence for each word
        wordsWithSentences.forEach(word => {
            // Select a random sentence from this word
            const randomSentenceIndex = Math.floor(Math.random() * word.sentences.length);
            const selectedSentence = word.sentences[randomSentenceIndex].from;
            const translation = word.sentences[randomSentenceIndex].to;

            // Replace the word in the sentence with underscores
            const modifiedSentence = selectedSentence.replace(
                new RegExp(`(?<!\\w)${word.text}(s|[.,!?])?(?!\\w)`, 'gi'),
                "________"
            );

            // Create the sentence element
            const targetDiv = document.createElement('div');
            targetDiv.innerHTML = `<strong class="missing-word-hebrew">${translation}</strong><br/><br/>${modifiedSentence}`;
            targetDiv.className = 'translation ltr';
            targetDiv.dataset.selectedWord = word.text;

            // Add event listeners
            targetDiv.addEventListener('dragover', this.handleDragOver);
            targetDiv.addEventListener('dragleave', this.handleDragLeave);
            targetDiv.addEventListener('drop', this.handleDrop);

            // Add to translation elements array
            this.translationElements.push(targetDiv);
        });

        log(`Created ${this.translationElements.length} sentence elements for words`);
    }

    // Organize words and sentences by page
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

        // For each page of words, find matching sentences
        for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
            const wordsOnPage = organizedWords[pageIndex];

            // For each word on this page, find a matching sentence
            for (const wordEl of wordsOnPage) {
                const wordText = wordEl.textContent;

                // Find a sentence for this word
                const matchingSentence = translationElements.find(
                    sentenceEl => sentenceEl.dataset.selectedWord === wordText
                );

                if (matchingSentence) {
                    // Remove from available translations to avoid duplicates
                    const index = translationElements.indexOf(matchingSentence);
                    if (index !== -1) {
                        translationElements.splice(index, 1);
                    }

                    // Add to this page's translations
                    organizedTranslations[pageIndex].push(matchingSentence);
                }
            }

            // If this page has no sentences yet, add one random sentence
            if (organizedTranslations[pageIndex].length === 0 && translationElements.length > 0) {
                organizedTranslations[pageIndex].push(translationElements.shift());
            }
        }

        // If we have remaining sentences, distribute them to pages
        let pageIndex = 0;
        while (translationElements.length > 0) {
            organizedTranslations[pageIndex % totalPages].push(translationElements.shift());
            pageIndex++;
        }

        // Update arrays
        this.wordElements = organizedWords.flat();
        this.translationElements = organizedTranslations.flat();

        log(`MissingWordGame organized: ${this.wordElements.length} words, ${this.translationElements.length} sentences`);
    }

    renderTarget() {
        // Load sentences for each word
        this.loadSentences();

        // Only organize and update if we have translations
        if (this.translationElements.length > 0) {
            // Organize all words and translations by page
            this.organizeWordsByPage();

            // Show the first page
            this.updatePage(0);
        }
    }

    // Override updatePage to show only one sentence at a time
    updatePage(pageNum: number) {
        // Call the parent method to handle words
        super.updatePage(pageNum);

        // After parent method clears and adds content to containers, 
        // ensure we only show one sentence in translationContainer
        const sentences = this.translationContainer.querySelectorAll('.translation');

        // First remove extra sentences
        if (sentences.length > 1) {
            // Keep only the first sentence
            for (let i = 1; i < sentences.length; i++) {
                sentences[i].remove();
            }
        }

        // Check if the remaining sentence has a matching visible word
        if (sentences.length > 0) {
            const sentence = sentences[0] as HTMLElement;
            const selectedWord = sentence.dataset.selectedWord;

            // Only keep sentences that have a matching word in the current visible words
            const hasMatchingWord = Array.from(this.wordContainer.querySelectorAll('.word'))
                .some(wordEl => {
                    const element = wordEl as HTMLElement;
                    return element.textContent === selectedWord &&
                        !element.classList.contains('correct') &&
                        element.style.display !== 'none';
                });

            // If no matching word is found, find a new sentence
            if (!hasMatchingWord && selectedWord) {
                // Look for another sentence in our translations that has a match
                const visibleWords = Array.from(this.wordContainer.querySelectorAll('.word'))
                    .filter(wordEl => {
                        const element = wordEl as HTMLElement;
                        return !element.classList.contains('correct') &&
                            element.style.display !== 'none';
                    })
                    .map(el => el.textContent);

                // Find a matching sentence from our loaded sentences
                const matchingSentence = this.translationElements.find(sentenceEl => {
                    return visibleWords.includes(sentenceEl.dataset.selectedWord);
                });

                if (matchingSentence) {
                    // Replace the current sentence
                    this.translationContainer.innerHTML = '';
                    const newSentence = matchingSentence.cloneNode(true) as HTMLElement;

                    // Re-attach event listeners to the new sentence
                    newSentence.addEventListener('dragover', this.handleDragOver);
                    newSentence.addEventListener('dragleave', this.handleDragLeave);
                    newSentence.addEventListener('drop', this.handleDrop);

                    this.translationContainer.appendChild(newSentence);
                } else {
                    // No matching sentence found, need to generate new sentences
                    this.loadSentences();
                    this.updatePage(pageNum); // Recursive call, will exit if a matching sentence is found
                }
            }
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

    // Override handleAnswer to properly handle page completion and navigation
    handleAnswer(targetEl: HTMLElement, isCorrect: boolean, wordElement: HTMLElement) {
        const self = this;

        // Call the parent implementation to handle basic answer logic
        super.handleAnswer(targetEl, isCorrect, wordElement);

        // Add extra handling for MissingWord game after word is marked correct
        if (isCorrect) {
            // Check if after the current animation, the page is complete
            wordElement.addEventListener('transitionend', function onAdditionalTransitionEnd() {
                wordElement.removeEventListener('transitionend', onAdditionalTransitionEnd);

                // Store total page count
                const beforeCheckTotalPages = self.totalPagesCount;

                // Check if page is empty or complete
                if (self.isPageEmpty(self.currentPage)) {
                    log('MissingWordGame: Page is now empty or complete');

                    // Mark the page as completed
                    self.completedPages.add(self.currentPage);

                    // Ensure we preserve total pages count
                    self.totalPagesCount = Math.max(beforeCheckTotalPages, self.totalPagesCount);

                    // Update pagination UI to show completed page
                    self.updatePaginationUI();

                    // Move to next page
                    self.moveToNextUncompletedPage();
                }
            });
        }
    }
}