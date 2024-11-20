var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { log } from '../utilities.js';
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
    constructor() {
        this.hasEnabledVoice = false;
        this.VoicePerLanguage = new Map();
        this.voiceSelect = document.getElementById('voiceSelect');
        this.getVoices("en").then(() => {
            log('voices loaded');
        });
    }
    static getInstance() {
        if (!VoiceService.instance) {
            VoiceService.instance = new VoiceService();
        }
        return VoiceService.instance;
    }
    getVoices(language) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.VoicePerLanguage.has(language)) {
                log('getVoices already loaded ' + language);
                return this.VoicePerLanguage.get(language);
            }
            log('getVoices ' + language);
            let attempts = 0;
            const maxAttempts = 50;
            const checkVoices = () => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        const voices = speechSynthesis.getVoices().filter(v => v.lang.startsWith(`${language}-`));
                        if (voices.length === 0 && attempts < maxAttempts) {
                            attempts++;
                            log('checkVoices will retry attempts: ' + attempts);
                            resolve(checkVoices()); // Recursively resolve promise on retry
                        } else {
                            const filteredVoices = voices.filter(voice => highQualityVoices.some(hqv => hqv.voiceURI === voice.voiceURI || hqv.name === voice.name || ["Google", "Microsoft"].some(v => voice.name.includes(v) || voice.voiceURI.includes(v))));
                            this.VoicePerLanguage.set(language, filteredVoices.length > 0 ? filteredVoices : voices);
                            console.table(this.VoicePerLanguage.get(language));
                            log('checkVoices voices:  (' + language + ') - ' + filteredVoices.length + " /  total:" + voices.length);
                            resolve();
                        }
                    }, 50);
                });
            };
            yield checkVoices();
            return this.VoicePerLanguage.get(language);
        });
    }
    speak(text, language, volume = 1) {
        return new Promise((resolve, reject) => {
            const speakerEnabled = localStorage.getItem('speakerEnabled');
            if (speakerEnabled === 'false') {
                log('speak disabled'); // by default true if not set
                resolve();
            }
            this.getVoices(language).then(() => {
                var _a;
                if (!this.hasEnabledVoice) {
                    const lecture = new SpeechSynthesisUtterance('hello Lior');
                    lecture.volume = 0;
                    window.speechSynthesis.cancel();
                    speechSynthesis.speak(lecture);
                    this.hasEnabledVoice = true;
                }
                //   this.speakTimeout = setTimeout(() => {
                const utterance = new SpeechSynthesisUtterance(text);
                const selectedVoice = this.voiceSelect.value; // todo move th ui from here
                const langVoices = this.VoicePerLanguage.get(language) || [];
                if (selectedVoice) {
                    const voice = langVoices.find(voice => voice.name === selectedVoice);
                    if (voice) {
                        utterance.voice = voice;
                        utterance.lang = voice.lang; // Let the voice dictate the language
                    }
                } else {
                    // If no voice selected, use default and set language to ensure correct pronunciation
                    let voice = langVoices.find(v => v.default);
                    if (!voice) {
                        voice = langVoices[0];
                    }
                    utterance.voice = langVoices.find(v => v.default);
                    utterance.lang = voice.lang;
                }
                utterance.volume = volume;
                this.cancelSpeak(); // must be called before speaking
                window.speechSynthesis.speak(utterance);
                resolve();
                log('speak: ' + utterance.lang + ' ' + (((_a = utterance.voice) === null || _a === void 0 ? void 0 : _a.name) || 'default') + ' ' + text);
            }).catch(error => {
                reject(error);
                log('speak error: ' + error);
            });
            //  }, 500);
        });
    }
    cancelSpeak() {
        speechSynthesis.cancel();
    }
}
