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
export class VoiceService {
    constructor() {
        this.hasEnabledVoice = false;
        this.VoicePerLanguage = new Map();
        this.voiceSelect = document.getElementById('voiceSelect');
        this.initializeVoiceSelect();
    }
    static getInstance() {
        if (!VoiceService.instance) {
            VoiceService.instance = new VoiceService();
        }
        return VoiceService.instance;
    }
    initializeVoiceSelect() {
        this.voiceSelect.addEventListener('change', this.handleVoiceChange.bind(this));
    }

    getVoices(language) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.VoicePerLanguage.has(language)) {
                log('loadVoices already loaded ' + language);
                return;
            }
            log('loadVoices ' + language);
            this.voiceSelect.innerHTML = '';
            let attempts = 0;
            const maxAttempts = 50;
            const checkVoices = () => {
                return new Promise((resolve) => {
                    const voices = speechSynthesis.getVoices().filter(v => v.lang.startsWith(`${language}-`));
                    this.VoicePerLanguage.set(language, voices);
                    console.table(voices);
                    if (voices.length > 0 || attempts >= maxAttempts) {
                        log('checkVoices voices: ' + voices.length);
                        // Add default browser voice option
                        resolve();
                    }
                    else {
                        log('checkVoices will retry attempts: ' + attempts);
                        attempts++;
                        setTimeout(() => checkVoices().then(resolve), 50);
                    }
                });
            };
            yield checkVoices();
            return this.VoicePerLanguage.get(language);
        });
    }
    selectVoice(language) {
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
        }
        else {
            // If no saved voice, select the default browser voice (first option)
            this.voiceSelect.selectedIndex = 0;
        }
    }
    handleVoiceChange(event) {
        const select = event.target;
        const selectedVoice = select.value;
        const language = this.voiceSelect.options[this.voiceSelect.selectedIndex].value;
        localStorage.setItem('selectedVoice_' + language, selectedVoice);
    }
    speak(text, language, volume = 1) {
        const speakerEnabled = localStorage.getItem('speakerEnabled');
        if (speakerEnabled === 'false') {
            log('speak disabled'); // by default true if not set
            return;
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
            const selectedVoice = this.voiceSelect.value;
            const langVoices = this.VoicePerLanguage.get(language) || [];
            if (selectedVoice) {
                const voice = langVoices.find(voice => voice.name === selectedVoice);
                if (voice) {
                    utterance.voice = voice;
                    utterance.lang = voice.lang; // Let the voice dictate the language
                }
            }
            else {
                // If no voice selected, use default and set language to ensure correct pronunciation
                const voice = langVoices.find(v => v.default);
                utterance.voice = langVoices.find(v => v.default);
                utterance.lang = voice.lang;
            }
            utterance.volume = volume;
            this.cancelSpeak(); // must be called before speaking
            log('speak: ' + utterance.lang + ' ' + (((_a = utterance.voice) === null || _a === void 0 ? void 0 : _a.name) || 'default') + ' ' + text);
            window.speechSynthesis.speak(utterance);
            //  }, 500);
        });
    }
    cancelSpeak() {
        clearTimeout(this.speakTimeout);
        speechSynthesis.cancel();
    }
}
