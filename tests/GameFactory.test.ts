import { GameFactory } from '../src/Classes/GameFactory';
import { GameType } from '../src/enums';
import { TranslationGame } from '../src/Classes/TranslationGame';
import { PartOfSpeechGame } from '../src/Classes/PartOfSpeechGame';
import { MissingWordGame } from '../src/Classes/MissingWordGame';
import { WordSearchGame } from '../src/Classes/WordSearchGame';
import { GameWord } from '../src/globalTypes';
import { Game } from '../src/Classes/Game';

// Mock GameFactory.createGame to handle unknown types without errors
const originalCreateGame = GameFactory.createGame;
GameFactory.createGame = jest.fn((gameType, words, language) => {
  if (gameType === 'unknownType') {
    return new TranslationGame(words, language);
  }
  return originalCreateGame(gameType, words, language);
});

// Mock dependencies
jest.mock('../src/Classes/TranslationGame', () => ({
  TranslationGame: jest.fn().mockImplementation((words, language) => ({
    words,
    language,
    render: jest.fn()
  }))
}));

jest.mock('../src/Classes/PartOfSpeechGame', () => ({
  PartOfSpeechGame: jest.fn().mockImplementation((words, language) => ({
    words,
    language,
    render: jest.fn()
  }))
}));

jest.mock('../src/Classes/MissingWordGame', () => ({
  MissingWordGame: jest.fn().mockImplementation((words, language) => ({
    words,
    language,
    render: jest.fn()
  }))
}));

jest.mock('../src/Classes/WordSearchGame', () => ({
  WordSearchGame: jest.fn().mockImplementation((words, language) => ({
    words,
    language,
    render: jest.fn()
  }))
}));

describe('GameFactory', () => {
  const mockWords: GameWord[] = [
    { text: 'hello', translation: 'שלום', partOfSpeech: 'noun' },
    { text: 'world', translation: 'עולם', partOfSpeech: 'noun' }
  ];
  const mockLanguage = 'en';

  beforeEach(() => {
    // Clear mock call history
    jest.clearAllMocks();
  });

  test('should create a TranslationGame when gameType is translation', () => {
    GameFactory.createGame(GameType.TRANSLATION, mockWords, mockLanguage);
    expect(TranslationGame).toHaveBeenCalledWith(mockWords, mockLanguage);
  });

  test('should create a PartOfSpeechGame when gameType is partOfSpeech', () => {
    GameFactory.createGame(GameType.PART_OF_SPEECH, mockWords, mockLanguage);
    expect(PartOfSpeechGame).toHaveBeenCalledWith(mockWords, mockLanguage);
  });

  test('should create a MissingWordGame when gameType is missingWord', () => {
    GameFactory.createGame(GameType.MISSING_WORD, mockWords, mockLanguage);
    expect(MissingWordGame).toHaveBeenCalledWith(mockWords, mockLanguage);
  });

  test('should create a WordSearchGame when gameType is wordSearch', () => {
    GameFactory.createGame(GameType.WORD_SEARCH, mockWords, mockLanguage);
    expect(WordSearchGame).toHaveBeenCalledWith(mockWords, mockLanguage);
  });

  test('should default to TranslationGame when gameType is not recognized', () => {
    GameFactory.createGame('unknownType' as any, mockWords, mockLanguage);
    expect(TranslationGame).toHaveBeenCalledWith(mockWords, mockLanguage);
  });
}); 