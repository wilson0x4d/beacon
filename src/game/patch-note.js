/**
 * a descriptor containing Patch Note details for a Game
 */
export class GamePatchNote {
    /**
     * @type {string}
     */
    version;
    /**
     * @type {Date}
     */
    patchDate;
    /**
     * @type {boolean}
     */
    isMajor;
    /**
     * @type {string}
     */
    summary;
    /** 
     * @type {string}
     */
    patchType;
    /**
     * constructs an instance of `GamePatchNote`
     * @param {string} version 
     */
    constructor(version) {
        this.version = version;
    }
}