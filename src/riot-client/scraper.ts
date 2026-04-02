import path from 'path';

import axios from 'axios';
import download from 'download';

import { ExportDir } from '~/dirs';
import { flattenObj } from '@utils/object';
import { addmd5HashtoFile } from '@utils/crypto';
import logger from 'signale';
import fs from 'fs-extra';

const riotClientManifests = [
    'https://lol.secure.dyn.riotcdn.net/channels/public/rccontent/theme/manifest_default.json',
    'https://lol.secure.dyn.riotcdn.net/channels/public/rccontent/tft/theme/manifest.json',
    'https://valorant.secure.dyn.riotcdn.net/channels/public/rccontent/theme/03/manifest_gb.json',
    'https://lion.secure.dyn.riotcdn.net/channels/public/rccontent/theme/manifest.json',
    'https://bacon.secure.dyn.riotcdn.net/channels/public/rccontent/theme/manifest.json',
    'https://wildrift.secure.dyn.riotcdn.net/channels/public/rccontent/theme/manifest.json',
    'https://riot-client.secure.dyn.riotcdn.net/channels/public/rccontent/theme/manifest_live.json',
];

const getGame = (url: string) => {
    if (url.includes('lol')) {
        if (url.includes('tft')) {
            return 'tft';
        }
        return 'lol';
    }

    if (url.includes('valorant')) return 'val';

    if (url.includes('bacon')) return 'lor';

    if (url.includes('wildrift')) return 'wr';

    if (url.includes('lion')) return '2xko';

    if (url.includes('riot-client')) return 'riot-client';

    return 'unknown';
};

export const scrapeRiotClient = () =>
    riotClientManifests.forEach(async (manifest) => {
        const res = await axios.get(manifest);
        const data = res.data;

        const obj = flattenObj(data);
        const keys: string[] = Object.keys(obj);

        const foundFiles: string[] = [];
        const url = new URL(manifest);
        const pathWithoutFile =
            url.origin + url.pathname.substring(0, url.pathname.lastIndexOf('/') + 1);

        for (const key of keys) {
            const value = obj[key];

            if (typeof value === 'string') {
                if (value.match(/.*\..*/gimu)) {
                    foundFiles.push(value);
                }
            }
        }

        for (const file of foundFiles) {
            const fileUrl = new URL(file, pathWithoutFile).href;

            const exportPath = path.join(ExportDir, 'riot-client', getGame(manifest));

            try {
                await download(fileUrl, exportPath);
            } catch (e) {
                logger.error(`error fetching file: ${fileUrl}`);
                logger.error(e);
            } finally {
                if (
                    fs.existsSync(
                        path.join(exportPath, file.split('/')[file.split('/').length - 1]!)
                    )
                ) {
                    addmd5HashtoFile(
                        path.join(exportPath, file.split('/')[file.split('/').length - 1]!)
                    );
                } else {
                    console.log(`path: ${exportPath} | file: ${file}`);
                    logger.warn(`${path.join(exportPath, file)} not found`);
                }
            }
        }
    });
