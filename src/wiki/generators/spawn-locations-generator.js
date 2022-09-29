import fs from 'fs';
import path from 'path';
import MWContentDescriptor from '../content-descriptor.js';

export default async function(config, ark, contentReader) {
    // given `path` emit a 'spawn locations fragment' compatible with Fandom

    if (!validateRequiredSettings(ark)) {
        return;
    }
    
    const mapStyles = ark.zones
        .filter((e) => e.id >= 0)
        .map((e) => 
            mapStyleFragment
                .replace('___ZONE_COLOR_VAR___', 'color-' + toZoneVar(e.name))
                .replace('___ZONE_COLOR___', e.color))
        .join('\n');

    const mapMarkers = ark.playerSpawns
        .filter((e) => e.regionId >= 0)
        .map((e) =>
            mapMarkerFragment
                .replace('___MARKER_LAT___', Math.round(e.lat * 10) / 10)
                .replace('___MARKER_LON___', Math.round(e.long * 10) / 10)
                .replace('___ZONE_COLOR_VAR___', 'color-' + toZoneVar(ark.zones[e.regionId].name))
                .replace('___ZONE_NAME___', ark.zones[e.regionId].name))
        .join('\n');

    const mapLegend = ark.zones
        .filter((e) => e.id >= 0)
        .map((e) =>
            mapLegendFragment
                .replace('___ZONE_COLOR_VAR___', 'color-' + toZoneVar(e.name))
                .replace('___ZONE_NAME___', e.name)
                .replace('___ZONE_DIFFICULTY___', e.difficulty === undefined ? '' : ` (${e.difficulty})`))
        .join('\n');

    const templateResult = templateFragment
        .replace('___MAP_IMAGE_FILE___', ark.map.file)
        .replace('___MAP_IMAGE_SIZE___', ark.map.size)
        .replace('___MAP_BORDER_COORDINATE_TOP___', ark.map.borderCoordinateTop)
        .replace('___MAP_BORDER_COORDINATE_LEFT___', ark.map.borderCoordinateLeft)
        .replace('___MAP_BORDER_COORDINATE_BOTTOM___', ark.map.borderCoordinateBottom)
        .replace('___MAP_BORDER_COORDINATE_RIGHT___', ark.map.borderCoordinateRight)
        .replace('___MAP_STYLES___', mapStyles)
        .replace('___MAP_MARKERS___', mapMarkers)
        .replace('___MAP_LEGEND___', mapLegend);

    const title = ark.worldSettings.name.replaceAll(' ', '_') + '/Spawn_Locations';
    return new MWContentDescriptor(
        title,
        templateResult,
        automationReplacementRegex,
        `regenerated from game data`);
}

function toZoneVar(input) {
    return input.replaceAll(' ', '').toLowerCase();
}

function validateRequiredSettings(ark, worldSettingsPath) {
    if (ark === undefined) {
        console.error('ARK reference null or missing');
        return false;
    } else if (ark.worldSettingsPath === undefined) {
        console.error('ARK world settings null or missing: ' + (ark.worldSettingsPath || '(null)'));
        return false;
    }
    return true;
}

const automationReplacementRegex = /\{\{#vardefine\:dotstyle\|display[\s\S]*\|\}\n\|\}/g;

const mapStyleFragment = '{{#vardefine:___ZONE_COLOR_VAR___|___ZONE_COLOR___}}';

const mapMarkerFragment = '| ___MARKER_LAT___, ___MARKER_LON___, , {{#var:___ZONE_COLOR_VAR___}}, ___ZONE_NAME___';

const mapLegendFragment = '|-\n\
| <div style="{{#var:dotstyle}}; background-color:{{#var:___ZONE_COLOR_VAR___}};"></div>\n\
| ___ZONE_NAME______ZONE_DIFFICULTY___';

const templateFragment = '\
{{#vardefine:dotstyle|display:inline-block; padding:0; width:15px; height:15px; margin:-3px; border-radius:50%; border:1px solid black;}}\n\
___MAP_STYLES___\n\
\n\
{| class="wikitable"\n\
|-\n\
| {{MapLocations\n\
|map=___MAP_IMAGE_FILE___\n\
|mapsize=___MAP_IMAGE_SIZE___\n\
|borderCoordT=___MAP_BORDER_COORDINATE_TOP___\n\
|borderCoordL=___MAP_BORDER_COORDINATE_LEFT___\n\
|borderCoordR=___MAP_BORDER_COORDINATE_RIGHT___\n\
|borderCoordB=___MAP_BORDER_COORDINATE_BOTTOM___\n\
___MAP_MARKERS___\n\
}}\n\
||\n\
Spawn Locations\n\
\n\
{| cellpadding="3"\n\
___MAP_LEGEND___\n\
|}\n\
|}';
