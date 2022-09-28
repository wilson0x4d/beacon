export default class MWContentDescriptor {
    title;
    content;
    fenceRegex;
    changeSummary;
    defaultContent;
    constructor(title, content, fenceRegex, changeSummary, defaultContent) {
        this.title = title;
        this.content = content;
        this.fenceRegex = fenceRegex;
        this.changeSummary = changeSummary;
        this.defaultContent = defaultContent;
    }
}