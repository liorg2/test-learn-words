import { Game } from "./Game.js";
import { log } from "../utilities.js";
export class MissingWordGame extends Game {
    constructor(words, language) {
        super(words, language);
    }
    updateInstructions() {
        this.setInstructions('יש לגרור את המילה החסרה במשפט.');
    }
    loadSentences() {
        this.translationContainer.innerHTML = ''; // Clear previous content
        const sentenceContainer = this.translationContainer;
        sentenceContainer.innerHTML = ''; // Clear previous content
        const randomSentence = this.getRandomWordAndModifiedSentence();
        const targetDiv = document.createElement('div');
        // targetDiv.textContent = randomSentence.modifiedSentence + '<br/>' + randomSentence.translation;
        //targetDiv.innerHTML = randomSentence.translation + '<br/><br/>' + randomSentence.modifiedSentence;
        targetDiv.innerHTML = `<strong class="missing-word-hebrew">${randomSentence.translation}</strong><br/><br/>${randomSentence.modifiedSentence}`;
        targetDiv.className = 'translation ltr';
        targetDiv.addEventListener('dragover', this.handleDragOver);
        targetDiv.addEventListener('dragleave', this.handleDragLeave);
        targetDiv.addEventListener('drop', this.handleDrop);
        targetDiv.dataset.selectedWord = randomSentence.selectedWord;
        sentenceContainer.appendChild(targetDiv);
    }
    getRandomWordAndModifiedSentence() {
        // Select a random word object
        const displayedWords = Array.from(document.querySelectorAll('.word'))
            .filter(element => element.offsetParent !== null && !element.classList.contains('correct'))
            .map(element => element.textContent);
        log('displayedWords ' + displayedWords.join(","));
        // Filter the words array to include only those that are displayed
        const filteredWords = this.words.filter(word => displayedWords.includes(word.text));
        if (filteredWords.length === 0) {
            log('No matching words found on the page.');
            return null; // or handle this case as needed
        }
        // Select a random word object from the filtered list
        const randomWordIndex = Math.floor(Math.random() * filteredWords.length);
        const selectedWord = filteredWords[randomWordIndex];
        // Select a random sentence from the chosen word object
        const randomSentenceIndex = Math.floor(Math.random() * selectedWord.sentences.length);
        const selectedSentence = selectedWord.sentences[randomSentenceIndex].from;
        const translation = selectedWord.sentences[randomSentenceIndex].to;
        // Replace the word in the sentence with underscores
        // Ensure only whole words are replaced
        // const modifiedSentence = selectedSentence.replace(new RegExp(`(?<!\\w)${selectedWord.text}(?!\\w)`, 'gi'), "________");
        const modifiedSentence = selectedSentence.replace(new RegExp(`(?<!\\w)${selectedWord.text}(s|[.,!?])?(?!\\w)`, 'gi'), "________");
        log('getRandomWordAndModifiedSentence ' + selectedWord.text + ' ' + modifiedSentence + ' ' + selectedSentence);
        return { selectedWord: selectedWord.text, modifiedSentence, selectedSentence, translation };
    }
    renderTarget() {
        this.loadSentences();
    }
}
