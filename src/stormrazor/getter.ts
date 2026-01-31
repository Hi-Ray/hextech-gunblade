import * as cheerio from 'cheerio';
import axios from 'axios';
import logger from 'signale';
import download from 'download';
import path from 'path';

import type { LolCatalogRoot } from '@interfaces/lolcatalog.interface.ts';
import { TempDir } from '~/dirs.ts';
import {
    getAddressableTools,
    getBinBundles,
    unzipAddressableTools,
    useAddressableTools,
} from '~/addressabletools';
import consts from '~/consts.ts';
import pLimit from 'p-limit';

const cache = new Map<string, string>();
const limit = pLimit(10);

export async function getFileBase(url: string, path?: string): Promise<string> {
    try {
        let data;

        if (cache.has(url)) {
            data = cache.get(url)!;
        } else {
            const res = await axios.get(url);

            data = res.data;

            cache.set(url, data);
        }
        const $ = cheerio.load(data);
        let filebase = '';

        $('script').each((i, el) => {
            if (!el.attribs.src) {
                return;
            }

            const src = el.attribs.src;

            if (src.includes('webpack-')) {
                const cleanUrl = src
                    .split('/')
                    .splice(0, src.split('/').length - 4)
                    .join('/');

                if (path) {
                    filebase = cleanUrl + `/${path}/WebGLBuild/StreamingAssets`;
                } else {
                    filebase = cleanUrl + '/WebGLBuild/StreamingAssets';
                }
            }
        });
        return filebase;
    } catch (e) {
        logger.error((e as any).message);
        throw new Error('Unable to get file base');
    }
}

export async function getCatalog(url: string) {
    if (url.startsWith('https://raw.communitydragon.org') || url.startsWith('/')) {
        return url;
    }

    const res = await axios.get(url);

    const data = res.data;
    const $ = cheerio.load(data);

    let catalogUrl = '';
    let clean = '';

    $('script').each((i, el) => {
        if (!el.attribs.src) {
            return;
        }

        const src = el.attribs.src;

        if (src.includes('webpack-')) {
            const cleanUrl = src
                .split('/')
                .splice(0, src.split('/').length - 4)
                .join('/');

            catalogUrl = cleanUrl + '/WebGLBuild/StreamingAssets/aa/catalog.json';
            clean = cleanUrl;
        }
    });

    try {
        const cata = await axios.get(catalogUrl);

        if (cata.status === 200) return catalogUrl;
    } catch {
        const catalogBinTemplate = clean + '/{{url}}/WebGLBuild/StreamingAssets/aa/catalog.bin';

        for (const cUrl of consts.knownComicUrls) {
            const potentialBinUrl = catalogBinTemplate.replace('{{url}}', cUrl);
            try {
                const comicRes = await axios.get(potentialBinUrl);

                if (comicRes.status === 200) {
                    return catalogBinTemplate.replace('{{url}}', cUrl);
                }
            } catch {
                //
            }
        }

        return catalogUrl;
    }

    throw new Error(`Unable to get catalog URL for ${url}`);
}

export async function downloadBinBundles(url: string, eventName: string, subPath: string) {
    logger.info('downloading bundles with addrtool');

    const binFileLocation = path.join(TempDir, eventName, subPath.split('?')[0] || subPath, 'bin');

    const catalogUrl = await getCatalog(url);

    if (catalogUrl?.includes('cdragon-bin')) {
    } else {
        if (catalogUrl) {
            await download(catalogUrl, binFileLocation);
        } else {
            throw new Error(`No catalog URL found for ${url}`);
        }
    }

    await getAddressableTools();
    await unzipAddressableTools();

    const binData = await useAddressableTools(path.join(binFileLocation, 'catalog.bin'));

    const binBundles = await getBinBundles(binData);

    logger.info(`Found ${binBundles.length} bundles`);

    const bundles = binBundles.map((str) =>
        str.replace(
            '{UnityEngine.AddressableAssets.Addressables.RuntimePath}',
            catalogUrl
                .split('/')
                .splice(0, catalogUrl.split('/').length - 1)
                .join('/')
        )
    );

    const bundlesDL: Promise<Buffer>[] = [];

    for (const bundle of bundles) {
        bundlesDL.push(
            limit(() =>
                download(
                    bundle,
                    path.join(TempDir, eventName, subPath.split('?')[0] || subPath, 'bundles')
                )
            )
        );
    }

    const bundlesdld = await Promise.allSettled(bundlesDL);

    bundlesdld.forEach((bundle, i) => {
        if (bundle.status === 'fulfilled') {
            logger.info(`Bundle: ${bundles[i]} Downloaded`);
        } else {
            logger.warn(`unable to download bundle: ${bundles[i]}`);
        }
    });
}

export async function downloadJsonBundles(url: string, eventName: string, subPath: string) {
    const catalogUrl = await getCatalog(url);

    const assetBasePath = catalogUrl
        .split('/')
        .splice(0, catalogUrl.split('/').length - 1)
        .join('/');

    const res = await axios.get(catalogUrl);
    const data: LolCatalogRoot = res.data;

    const bundles = data.m_InternalIds
        .filter((id: string) => id.endsWith('.bundle'))
        .map((str) =>
            str.replace('{UnityEngine.AddressableAssets.Addressables.RuntimePath}', assetBasePath)
        );

    const bundlesDL: Promise<Buffer>[] = [];

    for (const bundle of bundles) {
        bundlesDL.push(
            limit(() =>
                download(
                    bundle,
                    path.join(TempDir, eventName, subPath.split('?')[0] || subPath, 'bundles')
                )
            )
        );
    }

    const bundlesdld = await Promise.allSettled(bundlesDL);

    bundlesdld.forEach((bundle, i) => {
        if (bundle.status === 'fulfilled') {
            logger.info(`Bundle: ${bundles[i]} Downloaded`);
        } else {
            logger.warn(`unable to download bundle: ${bundles[i]}`);
        }
    });
}

export async function downloadBundles(url: string, eventName: string, subPath: string) {
    const catalogUrl = await getCatalog(url);

    if (catalogUrl?.startsWith('/fe/')) {
        logger.warn(`Fetching from raw`);
        return;
    }

    if (catalogUrl?.includes('bin')) {
        await downloadBinBundles(url, eventName, subPath);
    } else if (catalogUrl?.includes('json')) {
        await downloadJsonBundles(url, eventName, subPath);
    } else {
        logger.warn(`unable to download bundles for ${subPath}/${eventName}`);
    }
}
