import fs from 'fs';
import path from 'path';
import MWContentDescriptor from '../content-descriptor.js';

export default async function(config, platform, contentReader) {
    const contentUpdates = [];
    try {
        const versionTemplateTitle = 
            platform.name.toLowerCase() === 'pc'
                ? 'Template:Currentversion'
                : platform.name.toLowerCase() === 'xbox'
                    ? 'Template:Currentversionxbox'
                    : platform.name.toLocaleLowerCase() === 'playstation'
                        ? 'Template:Currentversionps'
                        : null;
        if (versionTemplateTitle !== null) {
            // take 'highest' version for platform, which assumes it is also the 'latest'
            const platformVersion = (platform.serverVersion !== undefined && platform.clientVersion !== undefined)
                ? (Number(platform.serverVersion) > Number(platform.clientVersion))
                    ? platform.serverVersion
                    : platform.clientVersion
                : platform.serverVersion || platform.clientVersion;
            contentUpdates.push(new MWContentDescriptor(
                versionTemplateTitle,
                `{{#vardefine:ver|${platformVersion}}}`,
                /\{\{#vardefine\:ver\|[\d\.]+\}\}/g,
                'version update'));
        }
    } catch (ex) {
        console.error(`Version Generator Failed: platform='${platform.name}', message='${ex.message}'`);
    }
    return contentUpdates;
}