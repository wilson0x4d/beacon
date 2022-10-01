import fs from 'fs';
import path from 'path';
import MD5HashAlgorithm from '../../util/md5.js';

export default class MWContentUpdater {
    #contentReader;
    #contentWriter;
    #md5;
    #outputDir;
    constructor(config, contentReader, contentWriter) {
        this.#contentReader = contentReader;
        this.#contentWriter = contentWriter;
        this.#md5 = new MD5HashAlgorithm();
        this.#outputDir = config.outputDir;
    }
    async update(contentDescriptor) {
        try {
            const contentHash = this.#md5.hash(contentDescriptor.content);
            let isNewContent = false;
            let rawContent = await this.#contentReader.read(contentDescriptor.title);
            if (rawContent === undefined) {
                // when a page is not found, determine if we have a default for the page, this is useful for things like patch notes which tend to be "created" rather than "edited"
                if (contentDescriptor.defaultContent !== undefined) {
                    rawContent = contentDescriptor.defaultContent;
                    isNewContent = true;
                }
            }
            // locate matches
            const matchFragements = rawContent.match(contentDescriptor.fenceRegex);
            if (matchFragements.length > 0) {
                let requiresUpdate = false;
                // check content for changes, optionally apply if changed
                for (let i = 0; i < matchFragements.length; i++) {
                    const matchFragment = matchFragements[i];
                    const matchFragmentHash = this.#md5.hash(matchFragment);
                    rawContent = rawContent.replace(matchFragment, contentDescriptor.content);
                    requiresUpdate = requiresUpdate || (matchFragmentHash !== contentHash);
                }
                // export the content for human reference/review
                this.export(contentDescriptor.title, rawContent);
                // if changes were required, write the updated content
                if (requiresUpdate) {
                    return await this.#contentWriter.write(
                        contentDescriptor.title,
                        contentDescriptor.contentType,
                        rawContent,
                        contentDescriptor.changeSummary,
                        isNewContent);
                } else {
                    return 'NO CHANGE';
                }
            } else {
                return `FENCING ERROR; ${rawContent}`;
            }
        } catch (ex) {
            return `ERROR; ${ex.message}`;
        }
    }
    export(title, content) {
        if (this.#outputDir === undefined) {
            return;
        }
        const outputFileName = path.resolve(
            this.#outputDir,
            title.replaceAll(':', '-'));
        //console.info(`EXPORTING: '${title}' as '${outputFileName}'`);
        const outputFileDir = path.dirname(outputFileName);
        if (!fs.existsSync(outputFileDir)) {
            fs.mkdirSync(outputFileDir, { recursive: true});
        }
        if (fs.existsSync(outputFileName)) {
            fs.rmSync(outputFileName);
        }
        fs.writeFileSync(outputFileName, content);
    }
}