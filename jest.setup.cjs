// jest.setup.cjs
// In Node v18.11.0+, you need to set TextEncoder to global
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock window.location
Object.defineProperty(window, 'location', {
  writable: true,
  value: {
    ...window.location,
    href: 'https://example.com',
    pathname: '/',
    search: ''
  }
});

// Mock window.localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock window.sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock
});

// Mock SpeechSynthesis
const speechSynthesisMock = {
  speak: jest.fn(),
  getVoices: jest.fn().mockReturnValue([]),
  cancel: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  onvoiceschanged: null
};

Object.defineProperty(window, 'speechSynthesis', {
  value: speechSynthesisMock
});

// Mock SpeechSynthesisUtterance
global.SpeechSynthesisUtterance = class {
  constructor(text) {
    this.text = text;
    this.voice = null;
    this.rate = 1;
    this.pitch = 1;
    this.volume = 1;
    this.lang = 'en-US';
  }
};

// Mock audio functions
global.HTMLMediaElement.prototype.play = jest.fn().mockReturnValue(Promise.resolve());
global.HTMLMediaElement.prototype.pause = jest.fn();
global.HTMLMediaElement.prototype.load = jest.fn();

// Mock history API
window.history.pushState = jest.fn();
window.history.replaceState = jest.fn(); 