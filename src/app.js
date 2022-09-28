import { config } from './config/config.js';
import { printInfo } from './util/cli-help.js'
import { MWTokenProvider, MWContentReader, MWContentWriter, MWContentUpdater } from './wiki/interactors/index.js';
import MWContentDescriptor from './wiki/content-descriptor.js';
printInfo();

config.initialize();

const mediaWikiInteractors = await initializeMediaWikiInteractors(config);

const contentUpdates = [];

await performContentUpdates(config, contentUpdates);

async function performContentUpdates(config, contentUpdates) {
    const contentUpdater = mediaWikiInteractors.contentUpdater;
    if (contentUpdater === null) {
        return;
    }
    console.info("Performing Content Updates..");
    let totalUpdates = 0;
    let totalWarnings = 0;
    let totalErrors = 0;
    for (let i = 0; i < contentUpdates.length; i++) {
        totalUpdates++;
        const contentDescriptor = contentUpdates[i];
        const result = await contentUpdater.update(contentDescriptor);
        if (result.indexOf('error') > -1) {
            totalErrors++;
            console.error(`[${totalUpdates}/${contentUpdates.length}] ${contentDescriptor.title}: ${result}`);
        } else if (result.indexOf('uccess') > -1) {
            console.info(`[${totalUpdates}/${contentUpdates.length}] ${contentDescriptor.title}: ${result}`);
        } else {
            totalWarnings++;
            console.warn(`[${totalUpdates}/${contentUpdates.length}] ${contentDescriptor.title}: ${result}`);
        }
    }
    console.info(`[${totalUpdates}/${contentUpdates.length}] Done; errors=${totalErrors}, warnings=${totalWarnings}, success=${totalUpdates - (totalErrors + totalWarnings)}`);
}
async function initializeMediaWikiInteractors(config) {
    const tokenProvider = new MWTokenProvider(config);
    const contentReader = new MWContentReader(config, tokenProvider);
    const contentWriter = new MWContentWriter(config, tokenProvider);
    const contentUpdater = new MWContentUpdater(config, contentReader, contentWriter);
    await tokenProvider.authorize();
    return {
        tokenProvider: tokenProvider,
        contentReader: contentReader,
        contentWriter: contentWriter,
        contentUpdater: contentUpdater
    };
}
