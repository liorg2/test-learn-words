 

declare global {
    interface Window {
        dataLayer: any[];
    }
}

window.dataLayer = window.dataLayer || [];

function gtag(...args: any[]) {
    window.dataLayer.push(args);
}

export function sendEvent(action: string, category: string, label: string, value: any) {
    try {
        gtag('event', action, {
            'event_category': category,
            'event_label': label,
            'value': value
        });
    } catch (e) {
        // Do nothing
    }
}

gtag('js', new Date());
gtag('config', 'G-JFJBS3FGK3');