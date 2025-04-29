import { Game } from "./Game.js";
export class TranslationGame extends Game {
    constructor(words, language) {
        super(words, language);
    }
    updateInstructions() {
        this.setInstructions('יש לגרור כל מילה אל התרגום שלה.');
    }
    loadTranslations() {
        this.translationContainer.innerHTML = ''; // Clear previous content
        const sortedTranslations = this.sortTranslations([...this.words]);
        sortedTranslations.forEach(word => {
            const translationDiv = this.renderTranslationDiv(word);
            this.translationContainer.appendChild(translationDiv);
        });
    }
    sortTranslations(words) {
        return words.sort((a, b) => a.translation.localeCompare(b.translation, 'he'));
    }
    renderTranslationDiv(word) {
        const targetDiv = document.createElement('div');
        targetDiv.className = 'translation';
        targetDiv.textContent = word.translation;
        targetDiv.addEventListener('dragover', this.handleDragOver);
        targetDiv.addEventListener('dragleave', this.handleDragLeave);
        targetDiv.addEventListener('drop', this.handleDrop);
        return targetDiv;
    }
    renderTarget() {
        this.loadTranslations();
    }
}
