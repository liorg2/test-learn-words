import { Game } from '../src/Classes/Game';
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

// Mock SoundService with a proper getInstance method
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

describe('Game Class', () => {
  let mockWords: GameWord[];
  let game: Game;

  beforeEach(() => {
    setupGameDom();
    mockWords = [
      { text: 'hello', translation: 'שלום', partOfSpeech: 'noun' },
      { text: 'world', translation: 'עולם', partOfSpeech: 'noun' }
    ];
    game = new Game(mockWords, 'en');
  });

  test('should initialize game properties correctly', () => {
    expect(game.words).toEqual(mockWords);
    expect(game.language).toBe('en');
    expect(game.score).toBe(0);
    expect(game.failures).toBe(0);
    expect(game.lives).toBe(10);
    expect(game.hasEnabledVoice).toBe(false);
  });

  test('should update score correctly', () => {
    game.updateScore(1);
    expect(game.score).toBe(1);
    expect(document.getElementById('scoreDisplay').textContent).toBe('1');
  });

  test('should update failures correctly', () => {
    game.updateFailures(1);
    expect(game.failures).toBe(1);
    expect(game.lives).toBe(9);
    expect(document.getElementById('numFailures').textContent).toBe('1');
    expect(document.getElementById('livesDisplay').textContent).toBe('9');
  });

  test('should show summary card when game ends', () => {
    // Mock showSummaryCard to avoid calling actual DOM manipulations
    jest.spyOn(game, 'showSummaryCard').mockImplementation(() => {});
    
    // Mock showConfetti to avoid calling actual DOM manipulations
    jest.spyOn(game, 'showConfetti').mockImplementation(() => {});
    
    // Mock a game over by setting words.length = 1 and updating score to 1
    game.words = [mockWords[0]];
    game.updateScore(1);
    
    expect(game.showSummaryCard).toHaveBeenCalledWith(true);
  });

  test('should create word div correctly', () => {
    const wordDiv = game.createWordDiv(mockWords[0], 'en');
    expect(wordDiv.textContent).toBe('hello');
    expect(wordDiv.className).toBe('word');
    expect(wordDiv.draggable).toBe(true);
  });

  test('static hideSummaryCardAndShowContainersStatic should restore UI', () => {
    // Setup - hide containers and add summary card
    const wordContainer = document.getElementById('wordContainer') as HTMLElement;
    const targetContainer = document.getElementById('targetContainer') as HTMLElement;
    const separator = document.querySelector('.separator') as HTMLElement;
    wordContainer.style.display = 'none';
    targetContainer.style.display = 'none';
    separator.style.display = 'none';
    
    const summaryCard = document.createElement('div');
    summaryCard.id = 'summaryCard';
    summaryCard.style.display = 'block';
    document.body.appendChild(summaryCard);
    
    // Call the static method
    Game.hideSummaryCardAndShowContainersStatic();
    
    // Assert the UI is restored
    expect(wordContainer.style.display).toBe('');
    expect(targetContainer.style.display).toBe('');
    expect(separator.style.display).toBe('');
    expect(summaryCard.style.display).toBe('none');
  });
}); 