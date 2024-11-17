export function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export function updateUrlParam(key: string, value: string) {
    const url = new URL(window.location.href);
    url.searchParams.set(key, value);
    window.history.pushState({}, '', url);
}


export function log(msg) {
    console.log(msg);
    // const logElement = document.getElementById('log');
    // const p = document.createElement('p');
    // p.textContent = msg;
    // logElement.insertBefore(p, logElement.firstChild);
}

//guid is a class
export function getGuid(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('guid') || null;
}