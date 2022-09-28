import spawnLocationsGenerator from './spawn-locations-generator.js';
import versionGenerator from './version-generator.js';
import patchNotesGenerator from './patch-notes-generator.js';
import versionModuleDataGenerator from './version-module-data-generator.js';

const arkGenerators = {
    spawnLocations: spawnLocationsGenerator
};

const patchGenerators = {
    patchNotes: patchNotesGenerator,
    versions: versionGenerator,
};

const dataGenerators = {
    versionModule: versionModuleDataGenerator,
}

export {
    arkGenerators,
    patchGenerators,
    dataGenerators
};
