import {Game} from "./Game.js";
import {GameWord} from "../globalTypes";

export class PartOfSpeechGame extends Game {
    constructor(words: GameWord[], language: string) {
        super(words, language);
    }

    updateInstructions() {
        this.setInstructions('יש לגרור כל מילה לחלק המשפט המתאים.');
    }

    loadPartsOfSpeech() {
        // Populate partOfSpeechContainer with all parts of speech

        this.translationContainer.innerHTML = ''; // Clear previous content
        const partsOfSpeech = new Set(this.words.map(m => m.partOfSpeech));
        partsOfSpeech.forEach(part => {
            const targetDiv: HTMLDivElement = document.createElement('div') as HTMLDivElement;
            targetDiv.textContent = part;
            targetDiv.className = 'translation';
            targetDiv.addEventListener('dragover', this.handleDragOver);
            targetDiv.addEventListener('dragleave', this.handleDragLeave);
            targetDiv.addEventListener('drop', this.handleDrop);
            this.translationContainer.appendChild(targetDiv);
        });
    }

    renderTarget() {
        this.loadPartsOfSpeech();
    }
}