import got from 'got';
import { JSDOM } from 'jsdom';
import { GamePatchNote } from '../../game/patch-note.js';
import GamePlatformDescriptor from '../../game/platform-descriptor.js';

export default class ForumPatchNotesReader {
    #forumUri;
    #skipPatchNotes;
    constructor(config) {
        this.#forumUri = config.forumUri;
        this.#skipPatchNotes = config.skipPatchNotes;
    }
    async read() {
        const platforms = [];

        const platformLinkRegex = /a href="(.*)" class=".*" title="(.*) Patch Notes/gi;
        const clientServerDateRegex = /Patch Notes: Client[\: ]*v([\d\.]+).+Server[\: ]*v([\d\.]+).+\(Updated: (.*)\)/i;
        const versionPatchNotesRegex = /v([\d\.]+)[^\d]*([\d]+[-\\\/][\d]+[-\\\/][\d]+).*(major|minor) version.*/i;
        const clientServerMinorVersion = /version [update\s]*for[\&nbsp\;\s]*(client|server)/mi;

        const indexBody = (await got
            .get(`${this.#forumUri}/forums/forum/5-changelog-patch-notes/`))
            .body;

        const platformLinkRegexMatches = indexBody.matchAll(platformLinkRegex);
        for (const element of platformLinkRegexMatches) {
            const platform = new GamePlatformDescriptor(element[2]);
            platforms.push(platform);
            platform.patchNotesLink = element[1];
            if (this.#skipPatchNotes === true) {
                continue;
            }
            try {
                const platformPatchNotes = (await got
                    .get(platform.patchNotesLink))
                    .body;

                const clientServerDateMatches = platformPatchNotes.match(clientServerDateRegex);
                if (clientServerDateMatches !== null) {
                    // populate current version details
                    platform.currentClientVersion = clientServerDateMatches[1];
                    platform.currentServerVersion = clientServerDateMatches[2];
                    platform.lastUpdateDate = new Date(clientServerDateMatches[3]);
                }
                // parse patch notes
                const dom = new JSDOM(platformPatchNotes);
                const noteElements = dom.window.document.querySelector('div.cPost_contentWrap div.ipsContained')?.children;
                if (noteElements === undefined) {
                    console.warn('..could not parse patch note elements, skipping.');
                } else {
                    const patchLimit = 1000; // TODO: lower this to a reasonable "daily" value, only doing this as an initial capture for missing patch notes
                    for (let i = 0; i < noteElements.length && i < patchLimit; i++) {
                        const ele = noteElements[i];
                        const versionPatchNotesRegexMatches = ele.innerHTML.match(versionPatchNotesRegex);
                        if (versionPatchNotesRegexMatches !== null) {
                            const ele2 = noteElements[++i];
                            let patchNoteSummary = ele2.innerHTML
                                // remove unwanted tags
                                .replaceAll(/\<\/li\>|\<[\/]*span[^\>]*\>|\<[\/]*font[^\>]*\>/g, '')
                                // reduce whitespace
                                .replaceAll(/\s+|\&nbsp\;|\&shy\;/g, ' ')
                                // convert list items to bullets
                                .replaceAll(/\<li[^\>]*\>\s*/gi, '\n* ')
                                // trim line endings
                                .replaceAll(/\s*$/gm, '')
                                // remove data-* attributes
                                .replaceAll(/\sdata-[^=]*="[^"]+"/g, '');
                            if (patchNoteSummary.indexOf('\n*') === -1) {
                                patchNoteSummary = `\n* ${patchNoteSummary.trim()}`;
                            }
                            const patchNote = new GamePatchNote(versionPatchNotesRegexMatches[1]);
                            patchNote.patchDate = new Date(versionPatchNotesRegexMatches[2]);
                            patchNote.isMajor = versionPatchNotesRegexMatches[3].endsWith('ajor');
                            patchNote.summary = patchNoteSummary;
                            const clientServerMinorVersionMatches = ele.innerHTML.match(clientServerMinorVersion);
                            if (clientServerMinorVersionMatches !== null) {
                                patchNote.patchType = clientServerMinorVersionMatches[1].toLowerCase();
                            }
                            platform.patchNotes.push(patchNote);
                        }
                    }
                }
            } catch (ex) {
                console.warn(`Patch Notes Error: ${platform.name}`);
            }
        }
        return platforms;
    }
}