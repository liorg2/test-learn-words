var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export class SoundService {
    constructor() {
        this.audioInitialized = false;
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        // Create audio elements
        this.correctSound = new Audio();
        this.incorrectSound = new Audio();
        this.gameOverSound = new Audio();
        this.gameOverSuccessSound = new Audio();
        // Set sources
        this.correctSound.src = 'assets/correct.mp3';
        this.incorrectSound.src = 'assets/error-2-36058.mp3';
        this.gameOverSound.src = 'assets/game-over.mp3';
        this.gameOverSuccessSound.src = 'assets/success-game.mp3';
        // Set to low latency mode
        this.correctSound.preload = 'auto';
        this.incorrectSound.preload = 'auto';
        this.gameOverSound.preload = 'auto';
        this.gameOverSuccessSound.preload = 'auto';
        // Initialize audio on iOS
        if (this.isIOS) {
            this.initIOSAudio();
            // Add touch event listeners to the document
            document.addEventListener('touchstart', () => this.initIOSAudio(), { once: true });
            document.addEventListener('touchend', () => this.initIOSAudio(), { once: true });
        }
    }
    initIOSAudio() {
        if (this.audioInitialized)
            return;
        // Load all sounds
        const loadSound = (audio) => __awaiter(this, void 0, void 0, function* () {
            try {
                audio.load();
                if (this.isIOS) {
                    // Set volume to 0 for initial play
                    audio.volume = 0;
                    yield audio.play();
                    audio.pause();
                    audio.currentTime = 0;
                    audio.volume = 1;
                }
            }
            catch (error) {
                console.error('Error initializing audio:', error);
            }
        });
        // Initialize all sounds
        Promise.all([
            loadSound(this.correctSound),
            loadSound(this.incorrectSound),
            loadSound(this.gameOverSound),
            loadSound(this.gameOverSuccessSound)
        ]).then(() => {
            this.audioInitialized = true;
            console.log('Audio initialized successfully');
        });
    }
    static isSpeakerEnabled() {
        return sessionStorage.getItem('speakersEnabled') !== 'false';
    }
    playAudio(sound) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!SoundService.isSpeakerEnabled())
                return;
            try {
                // For iOS, we need to handle the play/pause cycle
                if (this.isIOS) {
                    sound.currentTime = 0;
                    yield sound.play();
                }
                else {
                    // For other platforms, simply play
                    sound.currentTime = 0;
                    yield sound.play();
                }
            }
            catch (error) {
                console.error('Error playing sound:', error);
                // Try to reinitialize audio if there was an error
                if (this.isIOS) {
                    this.initIOSAudio();
                }
            }
        });
    }
    playCorrectSound() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.playAudio(this.correctSound);
        });
    }
    playIncorrectSound() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.playAudio(this.incorrectSound);
        });
    }
    playGameOverSound() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.playAudio(this.gameOverSound);
        });
    }
    playGameOverSuccessSound() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.playAudio(this.gameOverSuccessSound);
        });
    }
    static getInstance() {
        if (!SoundService.instance) {
            SoundService.instance = new SoundService();
        }
        return SoundService.instance;
    }
}
