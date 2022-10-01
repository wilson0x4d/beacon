import date from 'date-and-time';
import MWContentDescriptor from '../content-descriptor.js';
import { AppConfig } from '../../config/config.js';
import GamePlatformDescriptor from '../../game/platform-descriptor.js';
import MWContentReader from '../interactors/content-reader.js';

/**
 * Generates 'Version module Data content'
 * @async
 * @param {AppConfig} config
 * @param {GamePlatformDescriptor[]} platforms
 * @param {MWContentReader} contentReader
 * @returns {Promise<MWContentDescriptor[]>} zero or more content descriptors
 */
export default async function(config, platforms, contentReader) {
    if (config.wikiUri === undefined) {
        return [];
    }
    let totalMissingVersions = 0;
    const platformsRegex = /(PC[\s\S]+PC\:)|(Xbox[\s\S]+Xbox\:)|(PS[\s\S]+PS\:)/gi;
    const platformRegexes = {
        PC: /(PC[\s\S]+PC\:)/gi,
        Xbox: /(Xbox[\s\S]+Xbox\:)/gi,
        PS: /(PS[\s\S]+PS\:)/gi,
        Switch: /(Switch[\s\S]+Switch\:)/gi,
        Mobile: /(Mobile[\s\S]+Mobile\:)/gi
    };
    const versionsRegex = /[\s]*\{[\s]*"([\d\.]+)"[^"]+"([^-]+-[^-]+-[^"]+)"[\s\,]*(ClientOnly|ServerOnly)*.*$/gm;
    //
    const versionModuleDataTitle = `Module:Version/data`;
    let versionModuleDataNeedsUpdate = false;
    let versionModuleDataContent = await contentReader.read(versionModuleDataTitle);
    for (let i = 0; i < platforms.length; i++) {
        const platform = platforms[i];
        if (platform.patchNotes === undefined || platform.patchNotes.length === 0) {
            // unsupported, or no patch notes available. skipped.
            continue;
        }
        let platformNeedsUpdate = false;
        try {
            const platformRegex = platformRegexes[platform.code];
            const platformContent = [...versionModuleDataContent.matchAll(platformRegex)][0][0];
            const platformVersions = [...platformContent
                .matchAll(versionsRegex)]
                .map((value, index, array) => {
                    return {
                        version: value[1],
                        releaseDate: value[2],
                        flags: value[3]
                    };
                });

            for (const patchNote of platform.patchNotes) {
                const matchingEntries = platformVersions.filter((e) => e.version === patchNote.version );
                if (matchingEntries.length === 0) {
                    totalMissingVersions++;
                    platformNeedsUpdate = true;
                    platformVersions.push({
                        version: patchNote.version,
                        releaseDate: date.format(patchNote.patchDate, 'YYYY-MM-DD'),
                        flags: patchNote.isMajor ? undefined : `${patchNote.patchType.charAt(0).toUpperCase() + patchNote.patchType.slice(1).toLowerCase()}Only`
                    });
                }
            }
            
            if (platformNeedsUpdate) {
                versionModuleDataNeedsUpdate = true;
                // sort platformVersions, required by the module even though the module greedily produces an index it doesn't bother sorting
                platformVersions.sort(platformVersionComparer);
                // generate content fragment from `platformVersions` to replace existing `platformRegex`
                let platformVersionsFragment = `${platform.code} = {`;
                for (const e of platformVersions) {
                    const versionFlags = e.flags === undefined
                        ? ''
                        : `${e.flags} = true, `;
                    platformVersionsFragment += `\n\t\t{ "${e.version}", "${e.releaseDate}", ${versionFlags}},`;
                }
                platformVersionsFragment += `\n\t\t-- ${platform.code}:`;
                // update existing platform fragment in `versionModuleDataContent`
                versionModuleDataContent = versionModuleDataContent.replace(platformRegex, platformVersionsFragment);
            }
        } catch (ex) {
            console.error(`Version Module Data Generator Error: platform='${platform.name}', message='${ex.message}'`);
        }
    }

    return (versionModuleDataContent !== originalData)
        ? [ new MWContentDescriptor(
            versionModuleDataTitle,
            'text/plain',
            versionModuleDataContent,
            totalMissingVersions > 0
                ? `add ${totalMissingVersions} missing versions`
                : 'data corrections',
            /[\s\S]+/g) ]
        : [];
}

const versionMajorMinorRevisionBuildRegex = /([0-9]+)/g
function platformVersionComparer(a, b) {
    // respect release dates, first, because there is utterly stupid versioning in the data
    if (a.releaseDate !== '0-00-00' && b.releaseDate !== '0-00-00') {
        const leftDate = Date.parse(a.releaseDate);
        const rightDate = Date.parse(b.releaseDate);
        if (leftDate < rightDate) {
            return -1;
        } else if (leftDate > rightDate) {
            return 1;
        }
    }
    // for versions which appear on the same date, sort by version #
    const leftVersion = a.version.match(versionMajorMinorRevisionBuildRegex);
    const rightVersion = b.version.match(versionMajorMinorRevisionBuildRegex);
    if (leftVersion === null || rightVersion === null) {
        console.warn(`error parsing versions ${a.version} vs ${b.version}`);
        return 0;
    }
    for (let i = 0; i < 4; i++) {
        leftVersion[i] = leftVersion.length > i ? leftVersion[i] : '0';
        rightVersion[i] = rightVersion.length > i ? rightVersion[i] : '0';
        if (leftVersion[i] < rightVersion[i]) {
            return -1;
        } else if (leftVersion[i] > rightVersion[i]) {
            return 1;
        }
    }
    return 0;
}