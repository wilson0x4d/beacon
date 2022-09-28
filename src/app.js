import { config } from './config/config.js';
import { printInfo } from './util/cli-help.js'
import { MWTokenProvider, MWContentReader, MWContentWriter, MWContentUpdater } from './wiki/interactors/index.js';
import MWContentDescriptor from './wiki/content-descriptor.js';
printInfo();

config.initialize();

const mediaWikiInteractors = await initializeMediaWikiInteractors(config);

const contentUpdates = [];

for (const arkName in config.arks) {
    console.info(`Processing ARK: ${arkName}`);
    try {
        if (Object.hasOwnProperty.call(config.arks, arkName)) {
            config.arks[arkName] = prepareArkData(config.arks[arkName]);
        }
    } catch (ex) {
        console.warn(['err', ex]);
        continue;
    }
}
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

function prepareArkData(ark) {
    const worldSettingsPath = path.resolve(config.dataDir, ark.worldSettingsPath);
    if (!fs.existsSync(worldSettingsPath)) {
        throw new Error('ARK world settings missing or invalid: ' + (worldSettingsPath || '(null)'));
    }
    const worldSettingsJson = fs.readFileSync(worldSettingsPath, 'utf8');
    const worldSettingsData = JSON.parse(worldSettingsJson);
    return {
        worldSettings: worldSettingsData.worldSettings,
        playerSpawns: worldSettingsData.playerSpawns,
        ...ark
    };
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
