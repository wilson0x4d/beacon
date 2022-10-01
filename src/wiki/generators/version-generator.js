import MWContentDescriptor from '../content-descriptor.js';

export default async function(config, platform, contentReader) {
    if (config.skipPatchNotes === true) {
        return [];
    }
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
            const platformVersion = (platform.currentServerVersion !== undefined && platform.currentClientVersion !== undefined)
                ? (Number(platform.currentServerVersion) > Number(platform.currentClientVersion))
                    ? platform.currentServerVersion
                    : platform.currentClientVersion
                : platform.currentServerVersion || platform.currentClientVersion;
            contentUpdates.push(new MWContentDescriptor(
                versionTemplateTitle,
                'text/x-wiki',
                `{{#vardefine:ver|${platformVersion}}}`,
                'version update',
                /\{\{#vardefine\:ver\|[\d\.]+\}\}/g));
        }
    } catch (ex) {
        console.error(`Version Generator Failed: platform='${platform.name}', message='${ex.message}'`);
    }
    return contentUpdates;
}