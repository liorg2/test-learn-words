import { GameType } from "../enums.js";
import { TranslationGame } from "./TranslationGame.js";
import { PartOfSpeechGame } from "./PartOfSpeechGame.js";
import { MissingWordGame } from "./MissingWordGame.js";
export class GameFactory {
    static createGame(gameType, words, language) {
        switch (gameType) {
            case GameType.TRANSLATION:
                return new TranslationGame(words, language);
            case GameType.PART_OF_SPEECH:
                return new PartOfSpeechGame(words, language);
            case GameType.MISSING_WORD:
                return new MissingWordGame(words, language);
            default:
                throw new Error('Invalid game type');
        }
    }
}
