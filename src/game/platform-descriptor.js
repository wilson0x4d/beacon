/**
 * a Descriptor containing Platform-specific information for the Game
 */
export default class GamePlatformDescriptor {
    /** 
     * @type {string}
     */
    name;
    /**
     * a short code for the platform, such as PC, Xbox, PS, NS, etc
     * @type {string}
     */
    code;
    /**
     * @type {string}
     */
    patchNotesLink;
    /**
     * @type {string}
     */
    currentClientVersion;
    /**
     * @type {string}
     */
    currentServerVersion;
    /**
     * @type {Date}
     */
    lastUpdateDate;
    /**
     * @type {GamePatchNote[]}
     */
    patchNotes = [];
    /**
     * constructs an instance of `GamePlatformDescriptor`
     * @param {string} name 
     */
    constructor(name, code) {
        this.name = name;
        if (code === undefined) {
            switch (name.toLowerCase()) {
                case 'pc':
                    this.code = 'PC';
                    break;
                case 'xbox':
                    this.code = 'Xbox';
                    break;
                case 'playstation':
                    this.code = 'PS';
                    break;
                case 'switch':
                    this.code = 'Switch';
                    break;
                case 'mobile':
                    this.code = 'Mobile';
                    break;
                default:
                    this.code = name;
                    break;
            }
        } else {
            this.code = code;
        }
    }
}