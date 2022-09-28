export function printInfo() {
    console.info('Beacon v.0.1 by Shaun Wilson - MIT License; all rights reserved.')
}

export function printHelp() {
    throw Error('Help!');
    process.exit(0);
};
