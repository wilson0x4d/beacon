import got from 'got';
import MWTokenProvider from './token-provider.js';

/**
 * reads MediaWiki content
 */
export default class MWContentReader {
    /**
     * URI of the Wiki
     * @private
     * @type {string}
     */
    #wikiUri;
    /**
     * the Token Provider associated with the Wiki
     * @private
     * @type {MWTokenProvider}
     */
    #tokenProvider;
    /**
     * constructs an instance of `MWContentReader`
     * @param {AppConfig} config 
     * @param {MWTokenProvider} tokenProvider 
     */
    constructor(config, tokenProvider) {
        this.#wikiUri = config.wikiUri;
        this.#tokenProvider = tokenProvider;
    }
    /**
     * reads content for the specified `title`
     * @async
     * @param {string} title 
     * @returns {Promise<string>} raw content
     */
    async read(title) {
        try {
            const response = await got.get(
                `${this.#wikiUri}/${title}?action=raw`,
                {
                    headers: {
                        cookie: this.#tokenProvider.cookie
                    }
                });
            return response.body;
        } catch (ex) {
            if (ex.response?.statusCode === 404) {
                return undefined;
            } else {
                throw ex;
            }
        }
    }
}