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
        const clientServerDateRegex = /Patch Notes\: Client[\: ]*v([\d\.]+).+Server[\: ]*v([\d\.]+).+\(Updated: (.*)\)/i;
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
                    const patchLimit = 10;
                    for (let i = 0; i < noteElements.length && i < patchLimit; i++) {
                        const ele = noteElements[i];
                        const versionPatchNotesRegexMatches = ele.innerHTML.match(versionPatchNotesRegex);
                        if (versionPatchNotesRegexMatches !== null) {
                            const ele2 = noteElements[++i];
                            const patchDate = new Date(versionPatchNotesRegexMatches[2]);
                            let patchNoteSummary = ele2.innerHTML
                                // remove unwanted tags
                                .replaceAll(/\<\/li\>|\<[\/]*span[^\>]*\>|\<[\/]*font[^\>]*\>|\<[\/]*abbr[^\>]*\>/g, '')
                                .replaceAll(/\<[\/]*br[^\>]*\>|\<[\/]*hr[^\>]*\>/g, '\n')
                                // fence code snippets
                                .replaceAll(/\<[\/]*code[^\>]*\>/g, '`')
                                // fix formatting
                                .replaceAll(/\<[\/]*strong[^\>]*\>|\<[\/]*b[^\>]*\>/g, "'''")
                                .replaceAll(/\<[\/]*em[^\>]*\>|\<[\/]*i[^\>]*\>/g, "''")
                                // ensure preformatted code will wrap
                                .replaceAll(/\<pre[^\>]*\>/g, '<pre>')
                                // rework html entities
                                .replaceAll('&amp;', '&')
                                .replaceAll('&nbsp;', ' ')
                                .replaceAll('&nshy;', '')
                                .replaceAll('&lt;', '<')
                                .replaceAll('&gt;', '>')
                                .replaceAll('&quot;', '"')
                                .replaceAll('&apos;', "'")
                                .replaceAll('&copy;', '©')
                                .replaceAll('&reg;', '®')
                                .replaceAll('&hearts', '♥')
                                .replaceAll('&spades;', '♠')
                                .replaceAll('&clubs;', '♣')
                                .replaceAll('&diams;', '♦')
                                // strip links
                                .replaceAll(/\<a[^\>]*\>[\s\S]*?\<\/a\>/g, '???')
                                // reduce whitespace
                                .replaceAll(/\s+|\&nbsp\;|\&shy\;/g, ' ')
                                // convert list items to bullets
                                .replaceAll(/\<li[^\>]*\>\s*/gi, '\n* ')
                                // trim line endings
                                .replaceAll(/\s*$/gm, '')
                                // remove data-* attributes
                                .replaceAll(/\sdata-[^=]*="[^"]+"/g, '');
                            // wikify content (unicode, special text, etc)
                            patchNoteSummary = wikifyCodePoints(patchNoteSummary);
                            patchNoteSummary = wikifySpecialText(patchNoteSummary, patchDate);
                            if (patchNoteSummary.indexOf('\n*') === -1 && patchNoteSummary.length > 0) {
                                patchNoteSummary = `\n* ${patchNoteSummary.trim()}`;
                            }
                            const patchNote = new GamePatchNote(versionPatchNotesRegexMatches[1]);
                            patchNote.patchDate = patchDate;
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

function wikifyCodePoints(input) {
    let output = input;
    const codepointRegex = /&#(x*[a-zA-Z0-9]+);/g;
    let codepointRegexMatches = input.matchAll(codepointRegex);
    if (codepointRegexMatches !== null) {
        codepointRegexMatches = [...codepointRegexMatches];
        for (let i = 0; i < codepointRegexMatches.length; i++) {
            const e = codepointRegexMatches[i];
            console.log(e);
            const codepoint = (e[1][0] !== 'x')
                ? Number(e[1])
                : parseInt(e[1].substring(1), 16);
            output = output.replaceAll(e[0], String.fromCodePoint(codepoint));
        }
    }
    return output;
}

function wikifySpecialText(input, patchDate) {
    const output = input
        .replaceAll('Eggcellent Adventure', buildEggcellentAdventureLink(patchDate))
        .replaceAll('Fear Evolved', buildFearEvolvedLink(patchDate))
        .replaceAll('Love Evolved', buildLoveEvolvedLink(patchDate))
    return output;
}

function buildEggcellentAdventureLink(patchDate) {
    const eventNumber = (patchDate.getFullYear() - 2016) + 1
    return eventNumber > 1
        ? `{{ItemLink|link=ARK: Eggcellent Adventure ${eventNumber}|text=Eggcellent Adventure|image=Bunny Egg.png}}`
        : `{{ItemLink|link=ARK: Eggcellent Adventure|text=Eggcellent Adventure|image=Bunny Egg.png}}`;
}

function buildFearEvolvedLink(patchDate) {
    let eventNumber = (patchDate.getFullYear() - 2019) + 3;
    // deal with non-consecutive release years
    switch (patchDate.getFullYear()) {
        case 2015:
            eventNumber = 1;
            break;
        case 2016:
            eventNumber = 2;
            break;
    }
    return eventNumber > 1
        ? `{{ItemLink|link=ARK: Fear Evolved ${eventNumber}|text=Fear Evolved|image=Revealed_Jack-o'-lantern.png}}`
        : `{{ItemLink|link=ARK: Fear Evolved|text=Fear Evolved|image=Revealed_Jack-o'-lantern.png}}`;
}

function buildLoveEvolvedLink(patchDate) {
    const eventNumber = (patchDate.getFullYear() - 2020) + 1;
    return eventNumber > 1
        ? `{{ItemLink|link=ARK: Love Evolved ${eventNumber}|text=Love Evolved|image=Box o' Chocolates.png}}`
        : `{{ItemLink|link=ARK: Love Evolved|text=Love Evolved|image=Box o' Chocolates.png}}`;
}
