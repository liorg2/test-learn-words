import {log} from '../utilities.js';

const highQualityVoices = [
    

    {
        name: "Samantha",
        language: "en-US",
        gender: "female",
        quality: "high",
        voiceURI: "com.apple.speech.synthesis.voice.samantha",
        browser: "Safari"
    },
    {
        name: "Thomas",
        language: "fr-FR",
        gender: "male",
        quality: "high",
        voiceURI: "com.apple.speech.synthesis.voice.thomas",
        browser: "Safari"
    },
    {
        name: "Flixier British English",
        language: "en-GB",
        gender: "male",
        quality: "high",
        voiceURI: "Flixier-British-English",
        browser: "Flixier"
    },
    {
        name: "Flixier French",
        language: "fr-FR",
        gender: "female",
        quality: "high",
        voiceURI: "Flixier-French",
        browser: "Flixier"
    },


];
export class VoiceService {
    private static instance: VoiceService;
    private hasEnabledVoice = false;
    private speakTimeout: ReturnType<typeof setTimeout> | undefined;
    private voiceSelect: HTMLSelectElement;
    private VoicePerLanguage: Map<string, SpeechSynthesisVoice[]> = new Map<string, SpeechSynthesisVoice[]>();

    private constructor() {
        this.voiceSelect = document.getElementById('voiceSelect') as HTMLSelectElement;

    }

    public static getInstance(): VoiceService {
        if (!VoiceService.instance) {
            VoiceService.instance = new VoiceService();
        }
        return VoiceService.instance;
    }


    public async getVoices(language: string): Promise<SpeechSynthesisVoice[]> {

        if (this.VoicePerLanguage.has(language)) {
            log('getVoices already loaded ' + language);
            return this.VoicePerLanguage.get(language);
        }
        

        log('getVoices ' + language);
        
        let attempts = 0;
        const maxAttempts = 50;

        const checkVoices = () => {
            return new Promise<void>((resolve) => {
                const voices = speechSynthesis.getVoices().filter(v => v.lang.startsWith(`${language}-`));

                const filteredVoices = voices.filter(voice => {
                    return highQualityVoices.some(hqv => {
                        return hqv.voiceURI === voice.voiceURI || hqv.name === voice.name || ["Google", "Microsoft"].some(v => voice.name.includes(v) || voice.voiceURI.includes(v));
                    });
                });
                if (filteredVoices.length > 0) {
                    this.VoicePerLanguage.set(language, filteredVoices);
                } else {
                    this.VoicePerLanguage.set(language, voices); // Fallback to default browser voices if no match
                }
                console.table(this.VoicePerLanguage.get(language));

                if (this.VoicePerLanguage.get(language).length > 0 || attempts >= maxAttempts) {
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
            const selectedVoice = this.voiceSelect.value;// todo move th ui from here
            const langVoices: SpeechSynthesisVoice[] = this.VoicePerLanguage.get(language) || [];
            if (selectedVoice) {

                const voice: SpeechSynthesisVoice = langVoices.find(voice => voice.name === selectedVoice);
                if (voice) {
                    utterance.voice = voice;
                    utterance.lang = voice.lang; // Let the voice dictate the language
                }
            } else {
                // If no voice selected, use default and set language to ensure correct pronunciation
                let voice = langVoices.find(v => v.default)
                if (!voice) {
                    voice = langVoices[0];
                }
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