import fs from 'fs';
import path from 'node:path';
import { printHelp } from '../util/cli-help.js';

/**
 * represents the Configuration for the App
 */
export class AppConfig {
    #isInitialized = false;
    whatif = false;
    dataDir = undefined;
    outputDir = './wiki';
    playNiceMilliseconds = 3333;
    /** 
     * @type {string}
     */
    wikiUri = undefined;
    username = undefined;
    password = undefined;
    forumUri = undefined;
    arks = undefined;
    arkGenerators = undefined;
    patchGenerators = undefined;
    appSettings = { };
    initialize() {
        if (this.#isInitialized === true) {
            return;
        }
        this.#isInitialized = true;
        // load appsettings.json
        let appSettingsPath = 'appsettings.json';
        for (let i = 0; i < process.argv.length; i++) {
            switch (process.argv[i]) {
                case '--appsettings':
                    appSettingsPath = process.argv[i + 1];
                    break;
            }
        }
        if (fs.existsSync(appSettingsPath)) {
            const appSettingsJson = fs.readFileSync(appSettingsPath, 'utf8');
            this.appSettings = JSON.parse(appSettingsJson);
        } else {
            console.warn('Missing or Invalid appSettings path: ' + appSettingsPath);
        }
        // process command-line args
        for (let i = 0; i < process.argv.length; i++) {
            switch (process.argv[i]) {
                case '--arks':
                    // which arks are to be processed
                    this.#__config_configureArks(process.argv[i + 1]);
                    break;
        
                case '--data':
                    // which folder to be used for external data files
                    this.#__config_dataDir(process.argv[i + 1]);
                    break;

                case '--export':
                    this.#__config_outputDir(process.argv[i + 1]);
                    break;

                case '--wiki':
                    this.#__config_wikiUri(process.argv[i + 1]);
                    break;

                case '--username':
                    this.#__config_username(process.argv[i + 1]);
                    break;

                case '--password':
                    this.#__config_password(process.argv[i + 1]);
                    break;
        
                case '--forum':
                    this.#__config_forumUri(process.argv[i + 1]);
                    break;

                case '--whatif':
                case '--what-if':
                    this.#__config_whatif();
                    break;

                case '--help':
                    printHelp();
                    break;
            }
        }

        if (this.arks === undefined) {
            this.#__config_configureArks('all');
        }

        if (this.#__config_isValid() !== true) {
            printHelp();
        }       
    }
    #__config_isValid() {
        if (this.arks === undefined) {
            console.error('No ARK(s) specified.');
            return false; 
        } else if (this.dataDir === undefined) {
            console.error('No Data Directory specified.');
            return false;
        } else if (this.outputDir === undefined) {
            console.error('No Output Directory specified.');
            return false;
        } else if (!fs.existsSync(this.dataDir)) {
            console.error('Specified Data Directory was not found or is inaccessible: ' + this.dataDir);
            return false;
        } else if (!fs.existsSync(this.outputDir)) {
            console.error('Specified Output Directory was not found or is inaccessible: ' + this.outputDir);
            return false;
        }
        if (this.wikiUri !== undefined && (this.username === undefined || this.password === undefined)) {
            console.warn('A Wiki URI was provided, but a username or password was unspecified.');
        }
        return true;
    }
    #__config_dataDir(value) {
        value = path.resolve(value);
        if (fs.existsSync(value)) {
            this.dataDir = value;
        }
    }
    #__config_outputDir(value) {
        value = path.resolve(value);
        if (!fs.existsSync(value)) {
            fs.mkdirSync(value, { recursive: true });
        }
        this.outputDir = value;
    }
    #__config_wikiUri(value) {
        if (value.endsWith('/')) {
            value = value.substring(0, value.length - 1);
        }
        this.wikiUri = value;
    }
    #__config_username(value) {
        this.username = value;
    }
    #__config_password(value) {
        this.password = value;
    }
    #__config_whatif() {
        this.whatif = true;
    }
    #__config_forumUri(value) {
        if (value.endsWith('/')) {
            value = value.substring(0, value.length - 1);
        }
        this.forumUri = value;
    }
    #__config_configureArks(spec) {
        const arks = { };
        if (spec.toLowerCase() === 'all') {
            for (const arkName in this.appSettings.arks) {
                if (Object.hasOwnProperty.call(this.appSettings.arks, arkName)) {
                    arks[arkName] = this.appSettings.arks[arkName];
                }
            }
        } else {
            const parts = spec.toLowerCase().split(',');
            parts.forEach((v, j, arr) => arr[j] = arr[j].trim());
            for (let i = 0; i < parts.length; i++) {
                let wasFound = false;
                for (const arkName in this.appSettings.arks) {
                    if (arkName.toLowerCase() === parts[i]) {
                        if (Object.hasOwnProperty.call(this.appSettings.arks, arkName)) {
                            arks[arkName] = this.appSettings.arks[arkName];
                            wasFound = true;
                        }
                    }
                }
                if (!wasFound) {
                    console.warn('Invalid ARK specified, ignored: ' + parts[i]);
                }
            }
        }
        if (Object.keys(arks).length !== 0) {
            this.arks = arks;
        }
    }
}

export const config = new AppConfig();