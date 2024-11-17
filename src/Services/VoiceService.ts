import {log} from '../utilities.js';


export class VoiceService {
    private static instance: VoiceService;
    private hasEnabledVoice = false;
    private speakTimeout: ReturnType<typeof setTimeout> | undefined;
    private voiceSelect: HTMLSelectElement;

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


    public async loadVoices(language: string): Promise<void> {
        log('loadVoices ' + language);
        this.voiceSelect.innerHTML = '';
        let attempts = 0;
        const maxAttempts = 50;

        const checkVoices = () => {
            return new Promise<void>((resolve) => {
                const voices = speechSynthesis.getVoices().filter(v => {
                    const valid = v.lang.startsWith(`${language}-`);
                    if (!valid) {
                        // log('checkVoices voice: ' + v.name + ' ' + v.lang + ' ' + valid);
                    }
                    return valid;
                });

                if (voices.length > 0 || attempts >= maxAttempts) {
                    log('checkVoices voices: ' + voices.length);

                    // Add default browser voice option
                    const defaultOption = document.createElement('option');
                    defaultOption.textContent = `קול ברירת מחדל (${language})`;
                    defaultOption.value = '';
                    this.voiceSelect.appendChild(defaultOption);

                    // Add other available voices
                    voices.forEach(voice => {
                        const option = document.createElement('option');
                        option.textContent = `${voice.name} (${voice.lang})`;
                        option.value = voice.name;
                        this.voiceSelect.appendChild(option);
                    });

                    this.loadVoiceSettings(language);
                    resolve();
                } else {
                    log('checkVoices will retry attempts: ' + attempts);
                    attempts++;
                    setTimeout(() => checkVoices().then(resolve), 50);
                }
            });
        };

        await checkVoices();
    }

    private loadVoiceSettings(language: string) {
        const savedVoiceName = localStorage.getItem('selectedVoice_' + language);
        if (savedVoiceName) {
            log('loadVoiceSettings savedVoiceName: ' + savedVoiceName);
            for (let i = 0; i < this.voiceSelect.options.length; i++) {
                if (this.voiceSelect.options[i].value === savedVoiceName) {
                    log('savedVoiceName found loadVoiceSettings option.index: ' + i);
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

        if (!this.hasEnabledVoice) {
            const lecture = new SpeechSynthesisUtterance('hello Lior');
            lecture.volume = 0;
            window.speechSynthesis.cancel();
            speechSynthesis.speak(lecture);
            this.hasEnabledVoice = true;
        }

        this.speakTimeout = setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(text);
            const selectedVoice = this.voiceSelect.value;

            if (selectedVoice) {
                const voice = speechSynthesis.getVoices().find(voice => voice.name === selectedVoice);
                if (voice) {
                    utterance.voice = voice;
                    utterance.lang = voice.lang; // Let the voice dictate the language
                }
            } else {
                // If no voice selected, use default and set language to ensure correct pronunciation
                utterance.lang = language;
            }

            utterance.volume = volume;

            window.speechSynthesis.cancel(); // must be called before speaking
            log('speak: ' + utterance.lang + ' ' + (utterance.voice?.name || 'default') + ' ' + text);

            window.speechSynthesis.speak(utterance);
        }, 500);
    }

    public cancelSpeak(): void {
        clearTimeout(this.speakTimeout);
        speechSynthesis.cancel();
    }
}