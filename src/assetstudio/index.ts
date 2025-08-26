import os from 'os';
import process from 'process';
import { promises as fs } from 'fs';
import path from 'path';

import download from 'download';
import logger from 'signale';
import extract from 'extract-zip';

import { ASDir, ExportDir, TempDir } from '~/index.ts';
import { findFilesContaining } from '@utils/fs.ts';
import type { RiotAudioLoaderRoot } from '@interfaces/riotaudioloader.interface.ts';
import type { FileList } from '@interfaces/audiolist.interface.ts';
import { getFileBase } from '@stormrazor/getter.ts';
import { fetchCdragonLocales } from '@utils/cdragon.ts';
import { getAllValues } from '@utils/json.ts';
import { isValidUTF8, replaceLocalePlaceholder } from '@utils/string.ts';

function getASOS() {
    switch (os.platform()) {
        case 'win32':
            return 'win64';
        case 'darwin':
            return 'mac64';
        case 'linux':
            return 'linux64';
        default:
            return 'linux';
    }
}

export async function downloadAS() {
    await download(
        `https://github.com/aelurum/AssetStudio/releases/download/v0.18.0/AssetStudioModCLI_net6_${getASOS()}.zip`,
        ASDir
    );
}

export async function unzipAS() {
    const filename = `AssetStudioModCLI_net6_${getASOS()}.zip`;

    await extract(path.join(ASDir, filename), { dir: ASDir });
    if (os.platform() !== 'win32') {
        await fs.chmod(path.join(ASDir, 'AssetStudioModCLI'), 0o755);
    }
}

export async function useAssetStudioWin(
    eventName: string,
    bundleFolder: string,
    subEvent?: string
) {
    const proc = Bun.spawn(
        [
            path.join(ASDir, 'AssetStudioModCLI.exe'),
            bundleFolder,
            '-o',
            path.join(ExportDir, 'lol', eventName, subEvent || ''),
        ],
        {
            stdout: 'pipe',
            stderr: 'pipe',
        }
    );

    for await (const chunk of proc.stdout) {
        process.stdout.write(new TextDecoder().decode(chunk));
    }

    logger.info(`Process exited with code ${await proc.exited}`);
}

export async function useAssetStudioMacLin(
    eventName: string,
    bundleFolder: string,
    subEvent?: string
) {
    const proc = Bun.spawn(
        [
            path.join(ASDir, 'AssetStudioModCLI'),
            bundleFolder,
            '-o',
            path.join(ExportDir, 'lol', eventName, subEvent || ''),
        ],
        {
            stdout: 'pipe',
            stderr: 'pipe',
        }
    );

    for await (const chunk of proc.stdout) {
        process.stdout.write(new TextDecoder().decode(chunk));
    }

    logger.info(`Process exited with code ${await proc.exited}`);
}

async function getDirectories(srcPath: string) {
    const data = await fs.readdir(srcPath, { withFileTypes: true });
    return data.filter((entry) => entry.isDirectory()).map((entry_1) => entry_1.name);
}

export async function useAssetStudio(eventName: string, assetsFolder: string, subPath: string) {
    try {
        if (getASOS() === 'win64') {
            await useAssetStudioWin(eventName, assetsFolder, subPath);
        } else {
            await useAssetStudioMacLin(eventName, assetsFolder, subPath);
        }
    } catch (e) {
        logger.error(e);
    }
}

export async function extractAllEvents() {
    const events = await getDirectories(path.join(TempDir));

    for (const event of events) {
        const miniGameDirs = await getDirectories(path.join(TempDir, event));

        for (const miniGameDir of miniGameDirs) {
            try {
                await useAssetStudio(event, path.join(TempDir, event, miniGameDir), miniGameDir);
            } catch (e) {
                logger.error(e);
            }
        }
    }
}

export async function startMiniGameExtractor() {
    await downloadAS();
    await unzipAS();

    await extractAllEvents();
}

export async function extractAudioList(eventName: string, subPath: string, eventLink: string) {
    const files = await findFilesContaining(path.join(eventName, subPath), 'RiotAudioLoader');
    const fileList: FileList[] = [];

    for (const file of files) {
        const res = await fs.readFile(file, 'utf8');
        const data: RiotAudioLoaderRoot = JSON.parse(res);

        const oggFiles = data._nameList.map((name) => name + '.ogg');

        let location;

        if (os.platform() === 'win32') {
            const splitted = file.split('\\');
            location = splitted.splice(0, splitted.length - 1).join('\\');
        } else {
            const splitted = file.split('/');
            location = splitted.splice(0, splitted.length - 1).join('/');
        }

        const audioLocation = path.join(location, 'Assets', 'Audio');

        try {
            await fs.mkdir(audioLocation);
        } catch {
            /* empty */
        }

        for (const oggFile of oggFiles) {
            fileList.push({
                location: audioLocation,
                soundFX: (await getFileBase(eventLink)) + '/SoundFX/' + oggFile,
                VO: (await getFileBase(eventLink)) + '/AudioLocales/en_US/' + oggFile,
                VO_LOCAL:
                    (await getFileBase(eventLink)) + '/AudioLocales/{locale}/{locale}_' + oggFile,
            });
        }
    }
    return fileList;
}

export async function downloadAudio(fileList: FileList[]) {
    const cdragonLocales = Object.keys(await fetchCdragonLocales());

    for (const file of fileList) {
        for (const locale of cdragonLocales) {
            try {
                await download(file.soundFX, file.location);
            } catch {
                try {
                    await download(file.VO, file.location);
                } catch {
                    try {
                        await download(file.VO_LOCAL.replaceAll('{locale}', locale), file.location);
                    } catch {
                        // Empty
                    }
                }
            }
        }
    }
}

export function splitDir(path: string, amount: number) {
    if (os.platform() === 'win32') {
        return path.split('\\').splice(0, amount).join('\\');
    }

    return path.split('/').splice(0, amount).join('/');
}

export async function downloadAllVO(
    eventName: string,
    subPath: string,
    eventLink: string,
    value: string
) {
    if (!isValidUTF8(value)) {
        return;
    }

    try {
        decodeURI((await getFileBase(eventLink)) + '/AudioLocales/en_US/' + value + '.ogg');
    } catch {
        return;
    }

    try {
        await download(
            (await getFileBase(eventLink)) + '/AudioLocales/en_US/' + value + '.ogg',
            path.join(
                ExportDir,
                'lol',
                eventName,
                subPath.split('?')[0] || subPath,
                'Assets',
                'Audio'
            )
        );
    } catch {
        /* empty */
    } finally {
        try {
            const cdragonLocales = await fetchCdragonLocales();
            const locales = Object.keys(cdragonLocales);

            const localedl: Promise<Buffer>[] = [];
            for (const locale of locales) {
                localedl.push(
                    download(
                        (await getFileBase(eventLink)) +
                            replaceLocalePlaceholder('/AudioLocales/{locale}/{locale}_', locale) +
                            value +
                            '.ogg',
                        path.join(
                            ExportDir,
                            'lol',
                            eventName,
                            subPath.split('?')[0] || subPath,
                            'Assets',
                            'Audio'
                        )
                    )
                );
            }

            const localevodl = await Promise.allSettled(localedl);

            localevodl.forEach((locale, i) => {
                if (locale.status === 'rejected') {
                    logger.warn(`failed to download a locale VO`);
                }
            });
        } catch {
            // empty
        }
    }
}

export async function finalSweep(eventName: string, eventSubpath: string, eventLink: string) {
    const jsonFiles = await findFilesContaining(
        path.join(ExportDir, 'lol', eventName, eventSubpath.split('?')[0] || ''),
        '.json'
    );

    logger.warn('DOING FINAL SWEEP');

    const filesToDl: Promise<Buffer>[] = [];
    const vodl: Promise<any>[] = [];

    for await (const file of jsonFiles) {
        if (file.includes('RiotAudioLoader')) {
            continue;
        }

        const raw = await fs.readFile(file, 'utf8');

        if (raw.includes('SFX_')) {
            const values: any[] = getAllValues(JSON.parse(raw));

            for (const value of values) {
                if (typeof value !== 'string') {
                    continue;
                }

                if (!value.toLowerCase().includes('sfx')) {
                    continue;
                }

                try {
                    decodeURI((await getFileBase(eventLink)) + '/SoundFX/' + value + '.ogg');
                } catch {
                    /* empty */
                    continue;
                }

                try {
                    filesToDl.push(
                        download(
                            (await getFileBase(eventLink)) + '/SoundFX/' + value + '.ogg',
                            path.join(
                                ExportDir,
                                'lol',
                                eventName,
                                eventSubpath.split('?')[0] || eventSubpath,
                                'Assets',
                                'Audio'
                            )
                        )
                    );
                } catch {
                    // empty
                }
            }
        }

        if (raw.includes('VO_')) {
            const values: any[] = getAllValues(JSON.parse(raw));

            for (const value of values) {
                if (typeof value !== 'string') {
                    continue;
                }

                if (!value.toLowerCase().includes('vo')) {
                    continue;
                }

                vodl.push(downloadAllVO(eventName, eventSubpath, eventLink, value));
            }
        }
    }
    const vodld = await Promise.allSettled(vodl);
    const filedld = await Promise.allSettled(filesToDl);

    vodld.forEach((vo) => {
        if (vo.status === 'rejected') {
            /* empty */
        }
    });

    filedld.forEach((file) => {
        if (file.status === 'rejected') {
            /* empty */
        }
    });
}
