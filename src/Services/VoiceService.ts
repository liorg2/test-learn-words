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
        // this.getVoices("en").then(() => {
        //     log('voices loaded');
        // })

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

        const checkVoices = (): Promise<void> => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    const voices = speechSynthesis.getVoices().filter(v => v.lang.startsWith(`${language}-`));
                    if (voices.length === 0 && attempts < maxAttempts) {
                        attempts++;
                        log('checkVoices will retry attempts: ' + attempts);
                        resolve(checkVoices());  // Recursively resolve promise on retry
                    } else {
                        const filteredVoices = voices.filter(voice => highQualityVoices.some(hqv =>
                            hqv.voiceURI === voice.voiceURI || hqv.name === voice.name || ["Google", "Microsoft"].some(v =>
                                voice.name.includes(v) || voice.voiceURI.includes(v))));
                        this.VoicePerLanguage.set(language, filteredVoices.length > 0 ? filteredVoices : voices);
                        console.table(this.VoicePerLanguage.get(language));
                        log('checkVoices voices:  (' + language + ') - ' + filteredVoices.length + " /  total:" + voices.length);
                        resolve();
                    }
                }, 50);
            });
        };

        await checkVoices();

        return this.VoicePerLanguage.get(language);
    }


    public speak(text: string, language: string, volume: number = 1): Promise<void> {
        debugger
        return new Promise((resolve, reject) => {
            const speakerEnabled = localStorage.getItem('speakerEnabled');

            if (speakerEnabled === 'false') {
                log('speak disabled');// by default true if not set
                resolve();
            }

            this.getVoices(language).then(() => {

                const utterance = new SpeechSynthesisUtterance(text);
                utterance.onerror = (event) => {
                    log('speak error: ' + event.error + ' ' + text);
                    reject(event.error);
                }
                utterance.onend = () => {
                    log('speak end ' + text);

                }
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
                    debugger
                    let voice = langVoices.find(v => v.default)
                    if (!voice) {
                        voice = langVoices[0];
                    }
                    utterance.voice = voice;
                    utterance.lang = voice.lang;
                }

                utterance.volume = volume;

                this.cancelSpeak(); // must be called before speaking otherwise doesnt play..


                window.speechSynthesis.speak(utterance);
                log('speak: ' + utterance.lang + ' ' + (utterance.voice?.name || 'default') + ' ' + text);
                resolve();

            }).catch(error => {
                reject(error);
                log('speak error: ' + error);
            });

        });

    }

    private cancelSpeak(): void {
        speechSynthesis.cancel();
    }
}