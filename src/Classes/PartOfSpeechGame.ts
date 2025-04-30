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
            const targetDiv: HTMLDivElement = document.createElement('div') as HTMLDivElement;
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
        // Show first page
        if (this.translationElements.length > 0) {
            this.updatePage(0);
        }
    }
}