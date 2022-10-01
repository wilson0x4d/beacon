import fs from 'fs';
import path from 'path';
import date from 'date-and-time';
import MWContentDescriptor from '../content-descriptor.js';
import GamePlatformDescriptor from '../../game/platform-descriptor.js';
import MWContentReader from '../interactors/content-reader.js';

const defaultContent = `\
{{Infobox patch}}\n\
<onlyinclude>___!___</onlyinclude>\n\
{{Nav PatchNotes}}\n\
`;

const fragmentContent = `\
<onlyinclude><includeonly>'''Released''' - ___PATCH_DATE___ -''___MAJOR_MINOR___ version for ___PATCH_TYPE___s''</includeonly>\
___SUMMARY___\n\
</onlyinclude>`;

const fragmentContentRegex = /\<onlyinclude\>[\s\S]*\<\/onlyinclude\>/g;

const defaultDisambiguationContent = `\
{{disambig}}\n\
* [[___PLATFORM_PREFIX______PATCH_VERSION___ (Server)|___PATCH_VERSION___ (Server Update)]]\n\
* [[___PLATFORM_PREFIX______PATCH_VERSION___ (Client)|___PATCH_VERSION___ (Client Update)]]\n\
<noinclude>\n\
{{Nav PatchNotes}}\n\
</noinclude>\n\
`;

const disambiguationFragmentContentRegex = /\{\{disambig\}\}[\s\S]*\<noinclude\>/g;

/**
 * specific versions which were hand-constructed or
 * customized in a way that we do not want to automate
 * their updates.
 */
const blacklistVersions = [
    '343.7'
];

/**
 * 
 * @param {AppConfig} config 
 * @param {GamePlatformDescriptor} platform 
 * @param {MWContentReader} contentReader 
 * @returns 
 */
export default async function(config, platform, contentReader) {
    if (config.skipPatchNotes === true) {
        return [];
    }
    const contentUpdates = [];
    for (let i = 0; i < platform.patchNotes.length; i++) {
        const patchNote = platform.patchNotes[i];
        if (blacklistVersions.indexOf(patchNote.version) >= 0) {
            // NOTE: some version pages are hand-written in a way that they
            //       can't/shouldn't be managed by Beacon, so they are blacklisted.
            continue;
        }
        const title = `${getPlatformPrefix(platform)}${patchNote.version}`;
        // NOTE: we check for an existing page that is conflicting to the patch notes being processed,
        //       there are three outcomes for this check:
        //
        // 1. there is a disambiguation page (pointing at both client and server patch notes);
        //      a) abort/skip further processing, warn the user.
        //      b) this outcome assumes no new patch notes are appearing (already exist.)
        // 2. there is a patch notes page containing client notes;
        //      a) if we are processing client notes, emit an update.
        //      b) if we are processing server notes, emit a disambig page (as an update) and create new client/server pages.
        // 3. there is a patch notes page containing server notes;
        //      a) if we are processing server notes, emit an update.
        //      b) if we are processing client notes, emit a disambig page (as am update) and create new client/server pages.
        const existingContent = await contentReader.read(title);
        if (existingContent === undefined) {
            // there is no existing page, emit a page edit/creation
            // NOTE: the reason we emit this as a potential edit is for bulk processing of
            //       patch notes, where we may not have a pre-existing page. on this first
            //       run we will see the page converted between client/server notes. on a
            //       subsequent run we will see the page converted to a disambiguation page.
            //       this is a middle-ground to keep patch note generation simple (any other solution
            //       requires stateful inspection of pending content updates for the same version,
            //       which may be considered later, but is out of scope for the current implementation
            //       of Beacon.) -- this is considered a rare event not worth the investment since the
            //       final product is acceptable/expected.
            createPatchNote(platform, patchNote)
                .forEach(contentUpdate => {
                    contentUpdates.push(contentUpdate);
                });
        } else if (existingContent.match(/\{\{disambig\}\}/g) !== null) {
            // there is a disambiguation page, abort/skip.
        } else if (existingContent.match(/version for client/g) !== null && patchNote.patchType === 'server') {
            // there is a client page, and we have server patch notes with the same version, disambiguate.
            disambiguateClientPatchNote(platform, patchNote, existingContent)
                .forEach(contentUpdate => {
                    contentUpdates.push(contentUpdate);
                });
        } else if (existingContent.match(/version for server/g) !== null && patchNote.patchType === 'client') {
            // there is a server page, and we have client patch notes with the same version, disambiguate.
            disambiguateServerPatchNote(platform, patchNote, existingContent)
                .forEach(contentUpdate => {
                    contentUpdates.push(contentUpdate);
                });
        } else {
            // NOP: we do not emit an update because it is unlikely to be applied, and creates
            //      an opportunity for a single batch to contain both server and client in a single run,
            //      where each overwrites the other (and a stateful introspection of pending content
            //      updates would be required to deal with this scenario correctly.)
            //
            // TODO: inspect `contentUpdates` looking for a conflicting `title` (version), then run
            //       the relevant regexes to determine which disambiguation should be applied. in this
            //       scenario the "existing" patch note should be spliced out of the contentUpdates
            //       array (since the content update is going to be re-applied differently, anyway.)
        }
    }
    return contentUpdates;
}

function getPlatformPrefix(platform) {
    switch (platform.name.toLowerCase()) {
        case 'xbox':
            return 'Xbox_';
        case 'playstation':
            return 'PS_';
        default:
            return '';
    }
}

/**
 * ...
 * @param {GamePlatformDescriptor} platform 
 * @param {GamePatchNote} patchNote 
 */
function createPatchNote(platform, patchNote) {
    return [
        new MWContentDescriptor(
            `${getPlatformPrefix(platform)}${patchNote.version}`,
            'text/x-wiki',
            fragmentContent
                .replaceAll('___PATCH_DATE___', date.format(patchNote.patchDate, 'MMMM D, YYYY'))
                .replaceAll('___MAJOR_MINOR___', patchNote.isMajor ? 'Major' : 'Minor')
                .replaceAll('___PATCH_TYPE___', patchNote.isMajor ? 'server' : patchNote.patchType)
                .replaceAll('___SUMMARY___', patchNote.summary),
            'create patch notes',
            fragmentContentRegex,
            defaultContent)
    ];
};

function createFragmentContent(patchNote) {
    return fragmentContent
        .replaceAll('___PATCH_DATE___', date.format(patchNote.patchDate, 'MMMM D, YYYY'))
        .replaceAll('___MAJOR_MINOR___', patchNote.isMajor ? 'Major' : 'Minor')
        .replaceAll('___PATCH_TYPE___', patchNote.isMajor ? 'server' : patchNote.patchType)
        .replaceAll('___SUMMARY___', patchNote.summary);
}

function updatePatchNote(platform, patchNote) {
    return [
        new MWContentDescriptor(
            `${getPlatformPrefix(platform)}${patchNote.version}`,
            'text/x-wiki',
            fragmentContent
                .replaceAll('___PATCH_DATE___', formatDateWithDaySuffix(patchNote.patchDate))
                .replaceAll('___MAJOR_MINOR___', patchNote.isMajor ? 'Major' : 'Minor')
                .replaceAll('___PATCH_TYPE___', patchNote.isMajor ? 'server' : patchNote.patchType)
                .replaceAll('___SUMMARY___', patchNote.summary),
            'update patch notes',
            fragmentContentRegex,
            defaultContent)
    ];
};

function disambiguateClientPatchNote(platform, serverPatchNote, existingClientContent) {
    const serverContentFragment = createFragmentContent(serverPatchNote);
    const clientContentFragment = existingClientContent.match(fragmentContentRegex)[0];
    return disambiguate(platform, serverPatchNote, clientContentFragment, serverContentFragment);
}

function disambiguateServerPatchNote(platform, clientPatchNote, existingServerContent) {
    const serverContentFragment = existingServerContent.match(fragmentContentRegex)[0];
    const clientContentFragment = createFragmentContent(clientPatchNote);
    return disambiguate(platform, clientPatchNote, clientContentFragment, serverContentFragment);
}


function disambiguate(platform, patchNote, clientContentFragment, serverContentFragment) {
    return [
        new MWContentDescriptor(
            `${getPlatformPrefix(platform)}${patchNote.version}_(Client)`,
            'text/x-wiki',
            clientContentFragment,
            'add client patch notes',
            fragmentContentRegex,
            defaultContent.replaceAll('{{Infobox patch}}', '<!--{{Infobox patch}}-->')),
        new MWContentDescriptor(
            `${getPlatformPrefix(platform)}${patchNote.version}_(Server)`,
            'text/x-wiki',
            serverContentFragment,
            'add server patch notes',
            fragmentContentRegex,
            defaultContent.replaceAll('{{Infobox patch}}', '<!--{{Infobox patch}}-->')),
        new MWContentDescriptor(
            `${getPlatformPrefix(platform)}${patchNote.version}`,
            'text/x-wiki',
            defaultDisambiguationContent
                .replaceAll('___PLATFORM_PREFIX___', getPlatformPrefix(platform))
                .replaceAll('___PATCH_VERSION___', patchNote.version),
            'add client/server patch notes disambiguation page',
            /[\s\S]+/g,
            'MISSING')
    ]
}
