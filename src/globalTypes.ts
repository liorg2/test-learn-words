export interface GameWord {
    text: string;
    translation: string;
    partOfSpeech?: string;
    sentences?: { from: string; to: string }[]

}