import { config } from './config/config.js';
import { printInfo } from './util/cli-help.js'
printInfo();

config.initialize();
