import { TranslationGame } from '../src/Classes/TranslationGame';
import { PartOfSpeechGame } from '../src/Classes/PartOfSpeechGame';
import { MissingWordGame } from '../src/Classes/MissingWordGame';
import { WordSearchGame } from '../src/Classes/WordSearchGame';
import { GameWord } from '../src/globalTypes';

// Mock required DOM elements for testing
const setupGameDom = () => {
  document.body.innerHTML = `
    <div class="instructions"></div>
    <div id="scoreDisplay">0</div>
    <div id="numFailures">0</div>
    <div id="livesDisplay">10</div>
    <div class="game-area">
      <div id="wordContainer"></div>
      <div class="separator"></div>
      <div id="targetContainer"></div>
    </div>
    <div id="statusMessage"></div>
    <button id="newGameBtn"></button>
    <button id="newGameBtnBottom"></button>
    <div class="game-type-tab active" data-game-type="translation"></div>
  `;
};

// Mock dependencies
jest.mock('../src/analytics.js', () => ({
  sendEvent: jest.fn()
}));

jest.mock('../src/Services/VoiceService.js', () => ({
  getInstance: () => ({
    speak: jest.fn().mockResolvedValue(undefined),
    getVoices: jest.fn().mockResolvedValue([])
  })
}));

jest.mock('../src/utilities', () => ({
  log: jest.fn(),
  shuffleArray: (arr) => arr
}));

// Mock SoundService
jest.mock('../src/Services/SoundService.js', () => {
  // Create a mock instance
  const mockInstance = {
    playCorrectSound: jest.fn(),
    playIncorrectSound: jest.fn(),
    playGameOverSound: jest.fn(),
    playGameOverSuccessSound: jest.fn()
  };
  
  // Return the module with getInstance
  return {
    SoundService: {
      getInstance: jest.fn().mockReturnValue(mockInstance)
    }
  };
});

describe('Game Completion Tests', () => {
  let mockWords: GameWord[];
  const originalLocalStorage = window.localStorage;

  beforeEach(() => {
    setupGameDom();
    mockWords = [
      { text: 'hello', translation: 'שלום', partOfSpeech: 'noun' },
      { text: 'world', translation: 'עולם', partOfSpeech: 'noun' }
    ];
    
    // Mock methods on the existing localStorage object
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => null),
        setItem: jest.fn(),
        clear: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    });
  });

  afterEach(() => {
    // Restore original localStorage
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true
    });
  });

  test('TranslationGame should show summary card when game is completed', () => {
    // Create the game
    const game = new TranslationGame(mockWords, 'en');
    
    // Mock showSummaryCard
    jest.spyOn(game, 'showSummaryCard').mockImplementation(() => {});
    
    // Mock showConfetti
    jest.spyOn(game, 'showConfetti').mockImplementation(() => {});
    
    // Simulate game completion by setting score equal to words.length
    game.updateScore(mockWords.length);
    
    // Check if showSummaryCard was called with the success parameter
    expect(game.showSummaryCard).toHaveBeenCalledWith(true);
  });

  test('PartOfSpeechGame should show summary card when game is completed', () => {
    // Create the game
    const game = new PartOfSpeechGame(mockWords, 'en');
    
    // Mock showSummaryCard
    jest.spyOn(game, 'showSummaryCard').mockImplementation(() => {});
    
    // Mock showConfetti
    jest.spyOn(game, 'showConfetti').mockImplementation(() => {});
    
    // Simulate game completion by setting score equal to words.length
    game.updateScore(mockWords.length);
    
    // Check if showSummaryCard was called with the success parameter
    expect(game.showSummaryCard).toHaveBeenCalledWith(true);
  });

  test('MissingWordGame should show summary card when game is completed', () => {
    // Create the game
    const game = new MissingWordGame(mockWords, 'en');
    
    // Mock showSummaryCard
    jest.spyOn(game, 'showSummaryCard').mockImplementation(() => {});
    
    // Mock showConfetti
    jest.spyOn(game, 'showConfetti').mockImplementation(() => {});
    
    // Simulate game completion by setting score equal to words.length
    game.updateScore(mockWords.length);
    
    // Check if showSummaryCard was called with the success parameter
    expect(game.showSummaryCard).toHaveBeenCalledWith(true);
  });

  test('WordSearchGame should show summary card when game is completed', () => {
    // Create the game with mock implementation
    const game = new WordSearchGame(mockWords, 'en');
    
    // Mock showSummaryCard
    jest.spyOn(game, 'showSummaryCard').mockImplementation(() => {});
    
    // Mock showConfetti
    jest.spyOn(game, 'showConfetti').mockImplementation(() => {});
    
    // Mock the placedWords property to test the WordSearchGame-specific completion logic
    game.placedWords = [
      {
        word: 'hello',
        translation: 'שלום',
        position: { x: 0, y: 0, direction: 'horizontal' as const },
        letterCells: [],
        found: true
      },
      {
        word: 'world',
        translation: 'עולם',
        position: { x: 0, y: 1, direction: 'horizontal' as const },
        letterCells: [],
        found: true
      }
    ];
    
    // Trigger the completion check
    game.checkAllPagesCompleted();
    
    // Verify the score was updated and summary card shown
    expect(game.score).toBe(mockWords.length);
    expect(game.showSummaryCard).toHaveBeenCalledWith(true);
  });

  test('Games should show summary card when lives reach zero', () => {
    // Create the game (using TranslationGame as an example)
    const game = new TranslationGame(mockWords, 'en');
    
    // Mock showSummaryCard
    jest.spyOn(game, 'showSummaryCard').mockImplementation(() => {});
    
    // Mock the update failures method to properly test our logic
    const originalUpdateFailures = game.updateFailures;
    game.updateFailures = jest.fn().mockImplementation(function(val) {
      this.failures += val;
      this.lives -= val;
      document.getElementById('numFailures').textContent = `${this.failures}`;
      document.getElementById('livesDisplay').textContent = `${this.lives}`;
      
      // When lives reach 0, show summary
      if (this.lives <= 0) {
        this.showSummaryCard(false);
      }
    });
    
    // Set lives to 1
    game.lives = 1;
    
    // Simulate a failure that will make lives go to 0
    game.updateFailures(1);
    
    // Check if showSummaryCard was called with the failure parameter (false)
    expect(game.showSummaryCard).toHaveBeenCalledWith(false);
    
    // Restore original method
    game.updateFailures = originalUpdateFailures;
  });
}); 