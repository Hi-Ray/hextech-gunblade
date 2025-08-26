import { version } from '../package.json';

import logger from 'signale';
import * as process from 'process';
import { checkEnvironment, sync } from '~/sync.ts';

import path from 'path';

import { downloadAudio, extractAudioList, finalSweep, startMiniGameExtractor } from '~/assetstudio';
import { downloadBundles } from '@stormrazor/getter.ts';
import { getLolEvents } from '~/scraper.ts';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Date for the license notice
export const currentYear = new Date().getFullYear();

export const ExportDir =
    process.env.EXPORT_DIR && process.env.EXPORT_DIR.trim() !== ''
        ? process.env.EXPORT_DIR
        : path.join(__dirname, '../events/');

export const ASDir =
    process.env.AS_DIR && process.env.AS_DIR.trim() !== ''
        ? process.env.AS_DIR
        : path.join(__dirname, '../asset-studio/');

export const TempDir =
    process.env.TEMP_DIR && process.env.TEMP_DIR.trim() !== ''
        ? process.env.TEMP_DIR
        : path.join(__dirname, '../tmp/');

// License notice
console.log(
    `InfinityEdge Copyright (C) ${currentYear} Hi-Ray & Contributors ` +
        '\nThis program comes with ABSOLUTELY NO WARRANTY;' +
        '\nThis is free software, and you are welcome to redistribute it under certain conditions;' +
        '\nPlease see LICENSE.md'
);

console.log(`InfinityEdge Version: ${version}`);
console.log('');

// Start
logger.warn('< < < START > > >');

logger.warn(`Using "${ExportDir}" as the export directory.`);
console.log('ExportDir:', ExportDir);

logger.info('Loading environment variables...');

logger.info('Checking environment variables');

// Check FTP Environmental Variables
const ftp = checkEnvironment();

logger.warn('Getting lol events');
const events = await getLolEvents();

const bundles: Promise<void>[] = [];

for await (const event of events) {
    bundles.push(downloadBundles(event.link, event.eventName, event.subPath));
}

const bundlesResult = await Promise.allSettled(bundles);

bundlesResult.forEach((bundle, i) => {
    if (bundle.status === 'fulfilled') {
        logger.info(`Downloaded bundle for ${events[i]?.eventName}`);
    }
});

logger.warn('Starting minigame extractor');
await startMiniGameExtractor();

const audioDownload: Promise<void>[] = [];
const final: Promise<void>[] = [];

for await (const event of events) {
    const subPath = event.subPath.split('?')[0] || event.subPath;
    logger.info(
        `Fetching RiotAudioLoader ${path.join('events', 'lol', event.eventName)};${subPath}`
    );

    const list = await extractAudioList(
        path.join(ExportDir, 'lol', event.eventName),
        subPath,
        event.link
    );

    if (!list) {
        logger.warn(`No event sounds found for ${event.eventName}`);
        continue;
    }

    audioDownload.push(downloadAudio(list));

    final.push(finalSweep(event.eventName, event.subPath, event.link));
}

const adP = await Promise.allSettled(audioDownload);
const finalP = await Promise.allSettled(final);

adP.forEach((audio, i) => {
    if (audio.status === 'fulfilled') {
        logger.info(`Audio Downloaded`);
    }
});

finalP.forEach((final, i) => {
    if (final.status === 'fulfilled') {
        logger.info(`Completed ${i} of ${finalP.length}`);
    }
});

if (ftp) {
    await sync();
}
