import os from 'os';
import process from 'process';
import { promises as fs } from 'fs';
import path from 'path';

import { download } from '@utils/safeDL.ts';
import logger from 'signale';
import extract from 'extract-zip';

import { ASDir, ExportDir, TempDir } from '~/dirs.ts';
import { findFilesContaining } from '@utils/fs.ts';
import type { RiotAudioLoaderRoot } from '@interfaces/riotaudioloader.interface.ts';
import type { FileList } from '@interfaces/audiolist.interface.ts';
import { getFileBase } from '@stormrazor/getter.ts';
import { fetchCdragonLocales } from '@utils/cdragon.ts';
import { isValidUTF8, replaceLocalePlaceholder } from '@utils/string.ts';
import { existsSync } from 'node:fs';
import { flatten } from 'flat';
import consts from '~/consts';
import pLimit from 'p-limit';

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
        `https://github.com/aelurum/AssetStudio/releases/download/v0.19.0/AssetStudioModCLI_net9_${getASOS()}.zip`,
        ASDir
    );
}

export async function unzipAS() {
    const filename = `AssetStudioModCLI_net9_${getASOS()}.zip`;

    await extract(path.join(ASDir, filename), { dir: ASDir });
    if (os.platform() !== 'win32') {
        await fs.chmod(
            path.join(ASDir, `AssetStudioModCLI_net9_${getASOS()}`, 'AssetStudioModCLI'),
            0o755
        );
    }
}

export async function useAssetStudioWin(
    eventName: string,
    bundleFolder: string,
    subEvent?: string
) {
    const proc = Bun.spawn(
        [
            path.join(ASDir, `AssetStudioModCLI_net9_${getASOS()}`, 'AssetStudioModCLI.exe'),
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
            path.join(ASDir, `AssetStudioModCLI_net9_${getASOS()}`, 'AssetStudioModCLI'),
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
    const queue: Promise<void>[] = [];

    for (const event of events) {
        const miniGameDirs = await getDirectories(path.join(TempDir, event));

        for (const miniGameDir of miniGameDirs) {
            queue.push(useAssetStudio(event, path.join(TempDir, event, miniGameDir), miniGameDir));
        }
    }

    await Promise.allSettled(queue);
}

export async function startMiniGameExtractor() {
    await downloadAS();
    await unzipAS();

    await extractAllEvents();
}

export async function extractAudioList(eventName: string, subPath: string, eventLink: string) {
    if (!existsSync(eventName)) {
        return [];
    }

    logger.warn('extracting audio list');

    const files = [];
    const fileSearchTerms = ['_SFX', '_VO', 'RiotAudioLoader'];
    const fileList: FileList[] = [];

    for (const term of fileSearchTerms) {
        files.push(
            ...(await findFilesContaining(path.join(eventName, subPath), term)).filter((file) =>
                file.endsWith('.json')
            )
        );
    }

    for (const file of files) {
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

        const res = await fs.readFile(file, 'utf8');

        if (JSON.parse(res)._nameList) {
            const data: RiotAudioLoaderRoot = JSON.parse(res);
            const oggFiles = data._nameList.map((name) => name + '.ogg');

            for (const oggFile of oggFiles) {
                for (const url of consts.knownComicUrls) {
                    fileList.push({
                        location: audioLocation,
                        soundFX: (await getFileBase(eventLink, url)) + '/SoundFX/' + oggFile,
                        VO: (await getFileBase(eventLink, url)) + '/AudioLocales/en_US/' + oggFile,
                        VO_LOCAL:
                            (await getFileBase(eventLink, url)) + '/{locale}/{locale}_' + oggFile,
                    });
                }
            }
        } else if (JSON.parse(res).letteringSfx) {
            const parsed = JSON.parse(res);

            if (parsed.letteringSfx.clipName !== '') {
                const file = parsed.letteringSfx.clipName + '.ogg';
                for (const url of consts.knownComicUrls) {
                    fileList.push({
                        location: audioLocation,
                        soundFX: (await getFileBase(eventLink, url)) + '/SoundFX/' + file,
                        VO: '',
                        VO_LOCAL: '',
                    });
                }
            }
        } else if (JSON.parse(res).panelSfx) {
            const parsed = JSON.parse(res);

            if (parsed.panelSfx.clipName !== '') {
                const file = parsed.panelSfx.clipName + '.ogg';
                for (const url of consts.knownComicUrls) {
                    fileList.push({
                        location: audioLocation,
                        soundFX: '',
                        VO: (await getFileBase(eventLink, url)) + '/AudioLocales/en_US/' + file,
                        VO_LOCAL:
                            (await getFileBase(eventLink, url)) +
                            '/AudioLocales/{locale}/' +
                            `{locale}_${file}`,
                    });
                }
            }
        }
    }
    return fileList;
}

export async function downloadAudio(fileList: FileList[]) {
    const cdragonLocales = Object.keys(await fetchCdragonLocales());
    const toDL: Promise<Buffer | null>[] = [];

    for (const file of fileList) {
        if (file.soundFX) {
            toDL.push(download(file.soundFX, file.location));
        }

        if (file.VO) {
            toDL.push(download(file.VO, file.location));
        }

        if (file.VO_LOCAL) {
            for (const locale of cdragonLocales) {
                toDL.push(download(file.VO_LOCAL.replaceAll('{locale}', locale), file.location));
            }
        }
    }

    await Promise.allSettled(toDL);
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

    if (value.trim() === '') return;

    const fileb = (await getFileBase(eventLink)).split('/');

    fileb.splice(-2);

    const filebase = fileb.join('/');

    try {
        await download(
            filebase + '/Comic/WebGLBuild/StreamingAssets/AudioLocales/en_US/' + value + '.ogg',
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

            const localedl: Promise<Buffer | null>[] = [];
            for (const locale of locales) {
                localedl.push(
                    download(
                        filebase +
                            '/Comic/WebGLBuild/StreamingAssets/' +
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

            await Promise.allSettled(localedl);
        } catch {
            // empty
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

                const localedl: Promise<Buffer | null>[] = [];
                for (const locale of locales) {
                    localedl.push(
                        download(
                            (await getFileBase(eventLink)) +
                                replaceLocalePlaceholder(
                                    '/AudioLocales/{locale}/{locale}_',
                                    locale
                                ) +
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

                await Promise.allSettled(localedl);
            } catch {
                // empty
            }
        }
    }
}

export async function downloadSFX(
    eventLink: string,
    eventName: string,
    eventSubpath: string,
    cUrl: string,
    clipName: string
) {
    return download(
        (await getFileBase(eventLink, cUrl)) + '/SoundFX/' + clipName + '.ogg',
        path.join(
            ExportDir,
            'lol',
            eventName,
            eventSubpath.split('?')[0] || eventSubpath,
            'Assets',
            'Audio',
            'SoundFX'
        )
    );
}

export async function finalSweep(eventName: string, eventSubpath: string, eventLink: string) {
    const limit = pLimit(10);
    const jsonFiles = await findFilesContaining(
        path.join(ExportDir, 'lol', eventName, eventSubpath.split('?')[0] || ''),
        '.json'
    );

    logger.warn('DOING FINAL SWEEP');

    const filesToDl: Promise<Buffer | null>[] = [];
    const vodl: Promise<any>[] = [];
    const monoDl: Promise<any>[] = [];

    for await (const file of jsonFiles) {
        if (file.includes('RiotAudioLoader')) {
            continue;
        }

        const raw = await fs.readFile(file, 'utf8');

        if (raw.match(/(MU|AMB|SFX|UI|AudioKeys|SfxKey)/gim)) {
            if (
                file.toLowerCase().includes('sfx') ||
                file.toLowerCase().includes('mu') ||
                file.toLowerCase().includes('amb') ||
                file.toLowerCase().includes('ui') ||
                file.toLowerCase().includes('comic')
            ) {
                try {
                    const txt = await fs.readFile(file, 'utf8');
                    const obj = JSON.parse(txt);
                    if (obj.panelSfx) {
                        for (const cUrl of consts.knownComicUrls) {
                            filesToDl.push(
                                limit(() =>
                                    downloadSFX(
                                        eventLink,
                                        eventName,
                                        eventSubpath,
                                        cUrl,
                                        obj.panelSfx.clipName ?? obj.SfxKey.clipName
                                    )
                                )
                            );
                        }
                    } else if (obj.uiAudioKeys) {
                        for (const cUrl of consts.knownComicUrls) {
                            for (const key of obj.uiAudioKeys) {
                                filesToDl.push(
                                    limit(() =>
                                        downloadSFX(eventLink, eventName, eventSubpath, cUrl, key)
                                    )
                                );
                            }
                        }
                    } else if (obj.audioEvents) {
                        for (const cUrl of consts.knownComicUrls) {
                            for (const key of obj.audioEvents) {
                                filesToDl.push(
                                    limit(() =>
                                        downloadSFX(eventLink, eventName, eventSubpath, cUrl, key)
                                    )
                                );
                            }
                        }
                    } else {
                        const flat: any = flatten(obj);
                        const keys = Object.keys(flat);

                        for (const key of keys) {
                            if (
                                typeof flat[key] === 'string' &&
                                flat[key].trim() !== '' &&
                                flat[key].match(/_(MU|AMB|SFX|UI|AudioKeys|SfxKey)_/gm)
                            ) {
                                for (const cUrl of consts.knownComicUrls) {
                                    filesToDl.push(
                                        limit(() =>
                                            downloadSFX(
                                                eventLink,
                                                eventName,
                                                eventSubpath,
                                                cUrl,
                                                flat[key]
                                            )
                                        )
                                    );
                                }
                            }
                        }
                    }
                } catch {
                    //
                }
            } else {
                if (file.toLowerCase().includes('_vo')) {
                    try {
                        const txt = await fs.readFile(file, 'utf8');
                        const obj = JSON.parse(txt);

                        if (obj.letteringSfx) {
                            for await (const locale of Object.keys(await fetchCdragonLocales())) {
                                for await (const cUrl of consts.knownComicUrls) {
                                    if (
                                        locale.toLowerCase() === 'en_us' ||
                                        locale.toLowerCase() === 'en_gb' ||
                                        locale.toLowerCase() === 'en_au' ||
                                        locale.toLowerCase() === 'en_ph' ||
                                        locale.toLowerCase() === 'en_sg'
                                    ) {
                                        vodl.push(
                                            limit(async () =>
                                                download(
                                                    (await getFileBase(eventLink, cUrl)) +
                                                        '/AudioLocales/' +
                                                        `en_US/` +
                                                        obj.letteringSfx.clipName +
                                                        '.ogg',
                                                    path.join(
                                                        ExportDir,
                                                        'lol',
                                                        eventName,
                                                        eventSubpath.split('?')[0] || eventSubpath,
                                                        'Assets',
                                                        'Audio',
                                                        'AudioLocales',
                                                        'en_US'
                                                    )
                                                )
                                            )
                                        );
                                        continue;
                                    }
                                    vodl.push(
                                        limit(async () =>
                                            download(
                                                (await getFileBase(eventLink, cUrl)) +
                                                    '/AudioLocales/' +
                                                    `${locale}/` +
                                                    `${locale}_${obj.letteringSfx.clipName}` +
                                                    '.ogg',
                                                path.join(
                                                    ExportDir,
                                                    'lol',
                                                    eventName,
                                                    eventSubpath.split('?')[0] || eventSubpath,
                                                    'Assets',
                                                    'Audio',
                                                    'AudioLocales',
                                                    locale
                                                )
                                            )
                                        )
                                    );
                                }
                            }
                        }
                    } catch {
                        //
                    }
                }
            }
        }
    }
    await Promise.allSettled(monoDl);
    await Promise.allSettled(vodl);
    await Promise.allSettled(filesToDl);
}
