export class SoundService {
    private static instance: SoundService;
    private correctSound: HTMLAudioElement;
    private incorrectSound: HTMLAudioElement;
    private gameOverSound: HTMLAudioElement;
    private gameOverSuccessSound: HTMLAudioElement;
    private isIOS: boolean;
    private audioInitialized: boolean = false;

    private constructor() {
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
            document.addEventListener('touchstart', () => this.initIOSAudio(), {once: true});
            document.addEventListener('touchend', () => this.initIOSAudio(), {once: true});
        }
    }

    private initIOSAudio(): void {
        if (this.audioInitialized) return;

        // Load all sounds
        const loadSound = async (audio: HTMLAudioElement) => {
            try {
                audio.load();
                if (this.isIOS) {
                    // Set volume to 0 for initial play
                    audio.volume = 0;
                    await audio.play();
                    audio.pause();
                    audio.currentTime = 0;
                    audio.volume = 1;
                }
            } catch (error) {
                console.error('Error initializing audio:', error);
            }
        };

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

    private static isSpeakerEnabled(): boolean {
        // Check if speakers are enabled in session storage
        // Explicitly check for 'true', otherwise return false
        return sessionStorage.getItem('speakersEnabled') === 'true';
    }

    private async playAudio(sound: HTMLAudioElement): Promise<void> {
        if (!SoundService.isSpeakerEnabled()) return;

        try {
            // For iOS, we need to handle the play/pause cycle
            if (this.isIOS) {
                sound.currentTime = 0;
                await sound.play();
            } else {
                // For other platforms, simply play
                sound.currentTime = 0;
                await sound.play();
            }
        } catch (error) {
            console.error('Error playing sound:', error);
            // Try to reinitialize audio if there was an error
            if (this.isIOS) {
                this.initIOSAudio();
            }
        }
    }

    public async playCorrectSound(): Promise<void> {
        await this.playAudio(this.correctSound);
    }

    public async playIncorrectSound(): Promise<void> {
        await this.playAudio(this.incorrectSound);
    }

    public async playGameOverSound(): Promise<void> {
        await this.playAudio(this.gameOverSound);
    }

    public async playGameOverSuccessSound(): Promise<void> {
        await this.playAudio(this.gameOverSuccessSound);
    }

    public static getInstance(): SoundService {
        if (!SoundService.instance) {
            SoundService.instance = new SoundService();
        }
        return SoundService.instance;
    }
}