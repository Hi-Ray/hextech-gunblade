import sftp from 'ssh2-sftp-client';

import type { PathLike } from 'fs';
import * as fs from 'fs/promises';
import path from 'path';

import logger from 'signale';
import { ExportDir } from '~/index.ts';

const currentYear = new Date().getFullYear();
const currentMonth = ('0' + (new Date().getMonth() + 1)).slice(-2);

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
 * Directory exists cache.
 */
const existsCache: string[] = [];

/**
 * Sync the data with the FTP share.
 *
 * @async
 */
export const sync = async () => {
    checkEnvironment(true);

    const client = new sftp('infinityedge');

    await client.connect({
        username: process.env.FTP_USERNAME,
        password: process.env.FTP_PASSWORD,
        port: 22,
        host: process.env.FTP_URL,
    });

    if (!(await client.exists('/data'))) {
        logger.error('Could not find the data directory.');
        process.exit(1);
    }

    if (!(await client.exists(`/data/${currentYear}`))) {
        await client.mkdir(`/data/${currentYear}`);
    }

    const folders = await getDirectories(ExportDir);

    existsCache.push(ExportDir);

    existsCache.push(`events/${currentYear}`);

    for (const event of folders) {
        if (!(await client.exists(`data/${currentYear}/${event}`))) {
            const files = await getFileList(`events/${event}`);

            for (const file of files) {
                if (file.startsWith('riot-client')) {
                    if (
                        await client.exists(
                            `data/riot-client/${currentYear}/${currentMonth}/${
                                file.match(/\//g)?.length === 1
                                    ? file
                                    : file.replace('riot-client/', '')
                            }`
                        )
                    ) {
                        logger.info('file exists skipping');
                        continue;
                    }

                    if (
                        !(await client.exists(
                            path.dirname(
                                `data/riot-client/${currentYear}/${currentMonth}/${
                                    file.match(/\//g)?.length === 1
                                        ? file
                                        : file.replace('riot-client/', '')
                                }`
                            )
                        ))
                    ) {
                        await client.mkdir(
                            path.dirname(
                                `data/riot-client/${currentYear}/${currentMonth}/${
                                    file.match(/\//g)?.length === 1
                                        ? file
                                        : file.replace('riot-client/', '')
                                }`
                            ),
                            true
                        );
                    }
                    await client.put(
                        `events/${file}`,
                        `data/riot-client/${currentYear}/${currentMonth}/${
                            file.match(/\//g)?.length == 1 ? file : file.replace('riot-client/', '')
                        }`
                    );
                } else {
                    if (
                        await client.exists(
                            `data/${currentYear}/${file.replace('lol/', '').replace('tft/', '')}`
                        )
                    ) {
                        logger.info('file exists skipping');
                        continue;
                    }

                    logger.info(
                        'Transferring file ' +
                            `data/${currentYear}/${file.replace('lol/', '').replace('tft/', '')}`
                    );

                    if (
                        !(await client.exists(
                            path.dirname(
                                `data/${currentYear}/${file.replace('lol/', '').replace('tft/', '')}`
                            )
                        ))
                    ) {
                        await client.mkdir(
                            path.dirname(
                                `data/${currentYear}/${file.replace('lol/', '').replace('tft/', '')}`
                            ),
                            true
                        );
                    }

                    await client.put(
                        `events/${file}`,
                        `data/${currentYear}/${file.replace('lol/', '').replace('tft/', '')}`
                    );
                }
            }
        }
    }
    await client.end();
};
