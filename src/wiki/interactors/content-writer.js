import got from 'got';
import JsonFormBuilder from '../../util/jsonFormBuilder.js';
import playNice from '../../util/play-nice.js';

export default class MWContentWriter {
    #whatif;
    #wikiUri;
    #tokenProvider;
    #formBuilder;
    constructor(config, tokenProvider) {
        this.#whatif = config.whatif;
        this.#wikiUri = config.wikiUri;
        this.#tokenProvider = tokenProvider;
        this.#formBuilder = new JsonFormBuilder();
    }
    async write(title, contentFormat, content, summary, isNewContent) {
        if (this.#whatif === true) {
            return 'Success (--whatif)';
        }
        const csrfToken = await this.#tokenProvider.getCsrfToken();
        const params = {
            bot: true,
            minor: true,
            contentformat: contentFormat,
            //
            title: title,
            summary: summary,
            text: content,
            token: csrfToken
        };
        if (!isNewContent) {
            params.nocreate = true;
        } else {
            params.minor = true;
        }
        const form = this.#formBuilder.build(params);
        await playNice();
        const response = await got.post(
            `${this.#wikiUri}/api.php?action=edit&format=json`,
            {
                retry: { limit: 0 },
                headers: {
                    cookie: this.#tokenProvider.cookie
                },
                body: form
            });
        const body = JSON.parse(response.body);
        return body.edit?.result || `error=${body.error?.code}, message=${body.error?.info}`;
    }
}