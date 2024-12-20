export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
export function updateUrlParam(key, value) {
    const url = new URL(window.location.href);
    url.searchParams.set(key, value);
    window.history.pushState({}, '', url);
}
export function log(msg) {
    const now = new Date();
    const timestamp = now.toISOString();
    console.log(`${timestamp}: ${msg}`);
    if (new URLSearchParams(window.location.search).has('log')) {
        const logElement = document.getElementById('log');
        const p = document.createElement('p');
        p.textContent = `${timestamp}: ${msg}`;
        logElement.appendChild(p);
    }
}
//guid is a class
export function getGuid() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('guid') || null;
}
