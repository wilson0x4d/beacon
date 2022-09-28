import got from 'got';
import playNice from '../../util/play-nice.js';

/**
 * a Provider of Tokens for the Wiki (auth, csrf, etc)
 */
export default class MWTokenProvider {
    /**
     * URI of the Wiki
     * @private
     * @type {string}
     */
    #wikiUri;
    #username;
    #password;
    /**
     * an object representing the current 'session context'
     */
    #context;
    constructor(config) {
        this.#wikiUri = config.wikiUri;
        this.#username = config.username;
        this.#password = config.password;
    }
    /** 
     * gets a Cookie for the Wiki (session auth)  
     * @type {string}
     */
    get cookie() {
        return `bot=beacon; ${this.#context?.cookie}`;
    }
    /**
     * performs Authorization to acquire session context
     * @async
     */
    async authorize() {
        if (this.#context !== undefined) {
            return;
        } else if (this.#wikiUri === undefined
            || this.#username === undefined
            || this.#password === undefined) {
            console.warn('TokenProvider: Auth details are not configured, interactors may not function correctly.');
        } else {
            const loginContext = await this.#obtainLoginContext();
            const sessionContext = await this.#obtainSessionContext(loginContext);
            this.#context = sessionContext;
        }
    }
    /**
     * using session cookies, acquires a CSRF Token
     * @async
     * @returns {string} a CSRF Token
     */
    async getCsrfToken() {
        if (this.#context === undefined) {
            // NOTE: according to wikimedia current behavior, generate a 'no-auth' token
            return '+\\';
        }
        await playNice();
        const response = await got.get(
            `${this.#wikiUri}/api.php?action=query&meta=tokens&format=json`,
            {
                retry: { limit: 0 },
                headers: {
                    cookie: this.#context.cookie,
                }
            });
        const obj = JSON.parse(response.body);
        return obj.query?.tokens?.csrftoken;
    }
    async #obtainLoginContext() {
        // obtain login token
        // GET /api.php?action=query&meta=tokens&type=login&format=json
        const url = `${this.#wikiUri}/api.php?action=query&meta=tokens&type=login&format=json`;
        await playNice();
        const response = await got.get(
            url,
            {
                retry: { limit: 0 }
            });
        const cookie = this.#sanitizeCookies(response.headers['set-cookie'].join('; '));
        const obj = JSON.parse(response.body);
        const context = {
            cookie: cookie,
            token: obj.query.tokens.logintoken
        };
        return context;
    }
    async #obtainSessionContext(context) {
        // authenticate
        // POST /api.php?action=login&format=json
        await playNice();
        const response = await got.post(
            `${this.#wikiUri}/api.php?action=login&format=json`,
            {
                retry: { limit: 0 },
                headers: {
                    cookie: context.cookie,
                },
                form: {
                    lgname: this.#username,
                    lgpassword: this.#password,
                    lgtoken: context.token
                }
            });
        const body = JSON.parse(response.body);
        if (body.login?.result !== 'Success') {
            throw new Error("LOGIN: FAILED!");
        } else {
            console.info("LOGIN: SUCCESS!");
        }
        return {
            lguserid: body.login.lguserid,
            lgusername: body.login.lgusername,
            cookie: response.headers['set-cookie'].join('; ')
        };
    }
    #sanitizeCookies(cookies) {
        return cookies
            .replaceAll(';;', ';')
            .replaceAll(' SameSite=None;', '')
            .replaceAll(' Secure;', '')
            .replaceAll(' secure;', '')
            .replaceAll(' HttpOnly;', '')
            .split('; ')
            .filter((value, index, array) => 
                array.indexOf(value) === index
                && !value.startsWith("expire"))
            .join('; ')
             + ' SameSite=None; Secure; HttpOnly;';
    }
}