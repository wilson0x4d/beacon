import { config } from './config/config.js';
import { printInfo } from './util/cli-help.js'
import { MWTokenProvider, MWContentReader, MWContentWriter, MWContentUpdater } from './wiki/interactors/index.js';
printInfo();

config.initialize();

const mediaWikiInteractors = await initializeMediaWikiInteractors(config);

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
