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
        // if ('onvoiceschanged' in speechSynthesis) {
        //     log('voiceschanged supported');
        //     speechSynthesis.addEventListener('voiceschanged', () => {
        //         log('voiceschanged event');
        //     });
        // } else {
        //     log('voiceschanged not supported');
        // }
        if ('onvoiceschanged' in speechSynthesis) {
            log('voiceschanged supported');
            speechSynthesis.onvoiceschanged = () => {
                log('voiceschanged event triggered');
                this.logVoices();
            };
        } else {
            log('voiceschanged not supported');
            this.logVoices(); // Directly log voices if the event is not supported
        }
    }
    logVoices() {
        const voices = speechSynthesis.getVoices();
        log(`Available voices: ${voices.length}`);
        if (voices.length > 0) {
            log('Voices are loaded');
        } else {
            log('No voices are available');
        }
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
            if (speechSynthesis.getVoices().length > 0) {
                const voices = speechSynthesis.getVoices().filter(v => v.lang.startsWith(`${language}-`));
                const filteredVoices = voices.filter(voice => highQualityVoices.some(hqv => hqv.voiceURI === voice.voiceURI || hqv.name === voice.name || ["Google", "Microsoft"].some(v => voice.name.includes(v) || voice.voiceURI.includes(v))));
                this.VoicePerLanguage.set(language, filteredVoices.length > 0 ? filteredVoices : voices);
                log('getVoices voices (loaded):  (' + language + ') - ' + filteredVoices.length + " /  total:" + voices.length);
                return this.VoicePerLanguage.get(language);
            }
            log('getVoices waiting .. ' + language);
            let attempts = 0;
            const maxAttempts = 50;
            const waitForVoices = () => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        const voices = speechSynthesis.getVoices().filter(v => v.lang.startsWith(`${language}-`));
                        if (voices.length === 0 && attempts < maxAttempts) {
                            attempts++;
                            log('waitForVoices will retry attempts: ' + attempts);
                            resolve(waitForVoices()); // Recursively resolve promise on retry
                        } else {
                            const filteredVoices = voices.filter(voice => highQualityVoices.some(hqv => hqv.voiceURI === voice.voiceURI || hqv.name === voice.name || ["Google", "Microsoft"].some(v => voice.name.includes(v) || voice.voiceURI.includes(v))));
                            this.VoicePerLanguage.set(language, filteredVoices.length > 0 ? filteredVoices : voices);
                            console.table(this.VoicePerLanguage.get(language));
                            log('waitForVoices voices:  (' + language + ') - ' + filteredVoices.length + " /  total:" + voices.length);
                            resolve();
                        }
                    }, 50);
                });
            };
            yield waitForVoices();
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
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.onerror = (event) => {
                    log('speak error: ' + event.error + ' ' + text);
                    reject(event.error);
                };
                utterance.onend = () => {
                    log('speak end ' + text);
                };
                utterance.onstart = () => {
                    log('speak start ' + text);
                };
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
                    utterance.voice = voice;
                    utterance.lang = voice.lang;
                }
                utterance.volume = volume;
                this.cancelSpeak(); // must be called before speaking otherwise doesnt play..
                setTimeout(() => {
                    var _a;
                    speechSynthesis.speak(utterance);
                    log('speak: ' + utterance.lang + ' ' + (((_a = utterance.voice) === null || _a === void 0 ? void 0 : _a.name) || 'default') + ' ' + text);
                    resolve();
                }, 500);
            }).catch(error => {
                reject(error);
                log('speak error: ' + error);
            });
        });
    }
    cancelSpeak() {
        speechSynthesis.cancel();
    }
}
