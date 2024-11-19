import {log} from '../utilities.js';


export class VoiceService {
    private static instance: VoiceService;
    private hasEnabledVoice = false;
    private speakTimeout: ReturnType<typeof setTimeout> | undefined;
    private voiceSelect: HTMLSelectElement;
    private VoicePerLanguage: Map<string, SpeechSynthesisVoice[]> = new Map<string, SpeechSynthesisVoice[]>();

    private constructor() {
        this.voiceSelect = document.getElementById('voiceSelect') as HTMLSelectElement;
        this.initializeVoiceSelect();
    }

    public static getInstance(): VoiceService {
        if (!VoiceService.instance) {
            VoiceService.instance = new VoiceService();
        }
        return VoiceService.instance;
    }

    private initializeVoiceSelect() {
        this.voiceSelect.addEventListener('change', this.handleVoiceChange.bind(this));
    }


    public async getVoices(language: string): Promise<SpeechSynthesisVoice[]> {

        if (this.VoicePerLanguage.has(language)) {
            log('loadVoices already loaded ' + language);
            return;
        }

        log('loadVoices ' + language);
        this.voiceSelect.innerHTML = '';
        let attempts = 0;
        const maxAttempts = 50;

        const checkVoices = () => {
            return new Promise<void>((resolve) => {
                const voices = speechSynthesis.getVoices().filter(v => v.lang.startsWith(`${language}-`));
                this.VoicePerLanguage.set(language, voices);
                console.table(voices);

                if (voices.length > 0 || attempts >= maxAttempts) {
                    log('checkVoices voices: ' + voices.length);

                    // Add default browser voice option

                    resolve();
                } else {
                    log('checkVoices will retry attempts: ' + attempts);
                    attempts++;
                    setTimeout(() => checkVoices().then(resolve), 50);
                }
            });
        };

        await checkVoices();

        return this.VoicePerLanguage.get(language);
    }

    private selectVoice(language: string) {
        const savedVoiceName = localStorage.getItem('selectedVoice_' + language);
        if (savedVoiceName) {
            log('selectVoice savedVoiceName: ' + savedVoiceName);
            for (let i = 0; i < this.voiceSelect.options.length; i++) {
                if (this.voiceSelect.options[i].value === savedVoiceName) {
                    log('savedVoiceName found selectVoice option.index: ' + i);
                    this.voiceSelect.selectedIndex = i;
                    break;
                }
            }
        } else {
            // If no saved voice, select the default browser voice (first option)
            this.voiceSelect.selectedIndex = 0;
        }
    }

    private handleVoiceChange(event: Event) {
        const select = event.target as HTMLSelectElement;
        const selectedVoice = select.value;
        const language = this.voiceSelect.options[this.voiceSelect.selectedIndex].value;
        localStorage.setItem('selectedVoice_' + language, selectedVoice);


    }

    public speak(text: string, language: string, volume: number = 1): void {

        const speakerEnabled = localStorage.getItem('speakerEnabled');

        if (speakerEnabled === 'false') {
            log('speak disabled');// by default true if not set
            return;
        }

        this.getVoices(language).then(() => {


            if (!this.hasEnabledVoice) {
                const lecture = new SpeechSynthesisUtterance('hello Lior');
                lecture.volume = 0;
                window.speechSynthesis.cancel();
                speechSynthesis.speak(lecture);
                this.hasEnabledVoice = true;
            }

            //   this.speakTimeout = setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(text);
            const selectedVoice = this.voiceSelect.value;
            const langVoices: SpeechSynthesisVoice[] = this.VoicePerLanguage.get(language) || [];
            if (selectedVoice) {

                const voice: SpeechSynthesisVoice = langVoices.find(voice => voice.name === selectedVoice);
                if (voice) {
                    utterance.voice = voice;
                    utterance.lang = voice.lang; // Let the voice dictate the language
                }
            } else {
                // If no voice selected, use default and set language to ensure correct pronunciation
                const voice = langVoices.find(v => v.default)
                utterance.voice = langVoices.find(v => v.default);
                utterance.lang = voice.lang;
            }

            utterance.volume = volume;

            this.cancelSpeak(); // must be called before speaking
            log('speak: ' + utterance.lang + ' ' + (utterance.voice?.name || 'default') + ' ' + text);

            window.speechSynthesis.speak(utterance);
            //  }, 500);
        });

    }

    public cancelSpeak(): void {
        clearTimeout(this.speakTimeout);
        speechSynthesis.cancel();
    }
}