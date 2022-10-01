export default class MWContentDescriptor {
    title;
    contentType;
    content;
    fenceRegex;
    changeSummary;
    defaultContent;
    constructor(title, contentType, content, changeSummary, fenceRegex, defaultContent) {
        this.title = title;
        this.contentType = contentType;
        this.content = content;
        this.changeSummary = changeSummary;
        this.fenceRegex = fenceRegex;
        this.defaultContent = defaultContent;
    }
}