import sftp from 'ssh2-sftp-client';

import type { PathLike } from 'fs';
import * as fs from 'fs/promises';
import path from 'path';

import logger from 'signale';
import { ExportDir } from '~/dirs.ts';

const currentYear = new Date().getFullYear();
const currentMonth = ('0' + (new Date().getMonth() + 1)).slice(-2);

const config = {
    username: process.env.FTP_USERNAME,
    password: process.env.FTP_PASSWORD,
    port: parseInt(process.env.FTP_PORT || '22'),
    host: process.env.FTP_URL,
    keepaliveInterval: 10000,
    keepaliveCountMax: 10,
    readyTimeout: 40000,
};

/**
 * Check that the important environment variables aren't empty/null.
 *
 * @param [die=false] {boolean}
 */
export const checkEnvironment = (die: boolean = false) => {
    const environment = {
        FTP_URL: process.env.FTP_URL?.trim(),
        FTP_USERNAME: process.env.FTP_USERNAME?.trim(),
        FTP_PASSWORD: process.env.FTP_PASSWORD?.trim(),
    };

    for (const [key, value] of Object.entries(environment)) {
        if (!value) {
            logger.warn(`Missing environment variable: ${key}`);

            if (die) {
                process.exit(1);
            }
            return false;
        }
    }

    logger.info('FTP syncing enabled.');
    return true;
};

/**
 * Gets all the ftp directories.
 *
 * @async
 * @param source {PathLike} the source directory.
 */
const getDirectories = async (source: PathLike): Promise<string[]> =>
    (await fs.readdir(source, { withFileTypes: true }))
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

/**
 * Get the ftp file list.
 *
 * @async
 * @param dirName {string}
 */
const getFileList = async (dirName: string): Promise<string[]> => {
    let files: string[] = [];
    const items = await fs.readdir(dirName, { withFileTypes: true });

    for (const item of items) {
        if (item.isDirectory()) {
            files = [...files, ...(await getFileList(`${dirName}/${item.name}`))];
        } else {
            if (item.name.toLowerCase().includes('.ds_store')) {
                continue;
            }

            files.push(`${dirName}/${item.name}`.replace('events/', ''));
        }
    }

    return files;
};

/**
 * Sync the data with the FTP share.
 *
 * @async
 */
export const sync = async () => {
    checkEnvironment(true);
    const client = new sftp('infinityedge');

    const ensureConnection = async () => {
        try {
            await client.realPath('.');
        } catch {
            logger.warn('SFTP connection lost, attempting to reconnect...');
            await client.connect(config);
        }
    };

    await client.connect(config);

    client.on('error', (err) => logger.error('SFTP Error:', err.message));
    client.on('close', () => logger.warn('SFTP Connection Closed.'));

    try {
        await ensureConnection();

        if (!(await client.exists('/data'))) {
            logger.error('Data directory missing on server.');
            process.exit(1);
        }

        const folders = await getDirectories(ExportDir);

        for (const event of folders) {
            const files = await getFileList(`events/${event}`);

            for (const file of files) {
                const remotePath = file.startsWith('riot-client') ? '...' : '...';

                const performUpload = async () => {
                    await ensureConnection();

                    if (await client.exists(remotePath)) {
                        return logger.info(`Skipping ${file} (Exists)`);
                    }

                    const remoteDir = path.dirname(remotePath);
                    if (!(await client.exists(remoteDir))) {
                        await client.mkdir(remoteDir, true);
                    }

                    logger.info(`Uploading: ${file}`);
                    await client.put(`events/${file}`, remotePath);
                };

                try {
                    await performUpload();
                } catch {
                    logger.error(`Upload failed for ${file}, retrying once...`);
                    await performUpload();
                }
            }
        }
    } catch (err: any) {
        logger.fatal('Sync process interrupted:', err.message);
    } finally {
        await client.end();
    }
};
