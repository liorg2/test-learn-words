window.dataLayer = window.dataLayer || [];
function gtag(...args) {
    window.dataLayer.push(args);
}
export function sendEvent(action, category, label, value) {
    try {
        gtag('event', action, {
            'event_category': category,
            'event_label': label,
            'value': value
        });
    }
    catch (e) {
        // Do nothing
    }
}
gtag('js', new Date());
gtag('config', 'G-JFJBS3FGK3');
