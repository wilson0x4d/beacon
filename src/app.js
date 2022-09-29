import { config } from './config/config.js';
import { printInfo } from './util/cli-help.js'
import { MWTokenProvider, MWContentReader, MWContentWriter, MWContentUpdater } from './wiki/interactors/index.js';
import { arkGenerators, patchGenerators, dataGenerators } from './wiki/generators/index.js';
import ForumPatchNotesReader from './forum/interactors/patch-notes-reader.js';
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
            for (const generatorName in arkGenerators) {
                if (Object.hasOwnProperty.call(arkGenerators, generatorName)) {
                    const generator = arkGenerators[generatorName];
                    console.info(`Executing Generator: ${generatorName}`);
                    const contentDescriptor = await generator(config, config.arks[arkName], mediaWikiInteractors.contentReader);
                    if (contentDescriptor !== null) {
                        contentUpdates.push(contentDescriptor);
                    }
                }
            }
        }
    } catch (ex) {
        console.warn(['err', ex]);
        continue;
    }
}

const forumPatchNotesReader = new ForumPatchNotesReader(config);
const platforms = await forumPatchNotesReader.read();
if (config.skipPatchNotes !== true) {
    for (let i = 0; i < platforms.length; i++) {
        const platform = platforms[i];
        console.info(`Processing Platform: ${platform.name}`);
        // create content update for platform-specific version template
        for (const generatorName in patchGenerators) {
            if (Object.hasOwnProperty.call(patchGenerators, generatorName)) {
                const generator = patchGenerators[generatorName];
                console.info(`Executing Generator: ${generatorName}`);
                const contentDescriptors = await generator(config, platform, mediaWikiInteractors.contentReader);
                if (contentDescriptors.length > 0) {
                    contentDescriptors.forEach(contentDescriptor => {
                        contentUpdates.push(contentDescriptor);
                    });
                }
            }
        }
    }
}

console.info(`Generating Module Data..`);
for (const generatorName in dataGenerators) {
    if (Object.hasOwnProperty.call(dataGenerators, generatorName)) {
        const generator = dataGenerators[generatorName];
        console.info(`Executing Generator: ${generatorName}`);
        const contentDescriptors = await generator(config, platforms, mediaWikiInteractors.contentReader);
        if (contentDescriptors.length > 0) {
            contentDescriptors.forEach(contentDescriptor => {
                contentUpdates.push(contentDescriptor);
            });
        }
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
