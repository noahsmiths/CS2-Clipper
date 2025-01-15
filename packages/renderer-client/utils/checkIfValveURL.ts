export function checkIfValveURL(rawURL: string) {
    const url = new URL(rawURL);

    return /replay\d+\.valve\.net/.test(url.hostname);
}