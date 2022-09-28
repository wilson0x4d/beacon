import { config } from '../config/config.js';

/***
 * a helper method used to Play Nice(tm) with wiki servers
 * (ie. to not "flood" them)
 */

async function delay(milliseconds) {
    await (new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    }));
}

let timestamp = Date.now();

export default async function playNice() {
    const elapsedMilliseconds = Date.now() - timestamp;
    if (elapsedMilliseconds < config.playNiceMilliseconds) {
        const delayMilliseconds = config.playNiceMilliseconds - elapsedMilliseconds;
        //console.debug(`playNice: ${delayMilliseconds}`);
        await delay(delayMilliseconds);
    }
    timestamp = Date.now();
}