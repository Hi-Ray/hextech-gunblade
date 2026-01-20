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

const cache = new Map<string, string>();

export async function getFileBase(url: string) {
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

                filebase = cleanUrl + '/WebGLBuild/StreamingAssets';
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

    return axios
        .get(clean + '/Comic/WebGLBuild/StreamingAssets/aa/catalog.bin')
        .then(() => {
            return clean + '/Comic/WebGLBuild/StreamingAssets/aa/catalog.bin';
        })
        .catch(() => {
            return catalogUrl;
        });
}

export async function downloadBinBundles(url: string, eventName: string, subPath: string) {
    logger.info('downloading bundles with addrtool');

    const binFileLocation = path.join(TempDir, eventName, subPath.split('?')[0] || subPath, 'bin');

    const catalogUrl = await getCatalog(url);

    logger.fav(`catalogUrl dlbinbundles: ${catalogUrl}`);

    if (catalogUrl.includes('cdragon-bin')) {
    } else {
        download(catalogUrl, binFileLocation);
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
            download(
                bundle,
                path.join(TempDir, eventName, subPath.split('?')[0] || subPath, 'bundles')
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

    logger.fav(`catalogUrl dljsonbundles: ${catalogUrl}`);

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
            download(
                bundle,
                path.join(TempDir, eventName, subPath.split('?')[0] || subPath, 'bundles')
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

    if (catalogUrl.startsWith('/fe/')) {
        logger.warn(`Fetching from raw`);

        return;
    }

    if (catalogUrl.includes('bin')) {
        logger.info('catalog.bin found, downloading bundles with addrtool');
        await downloadBinBundles(url, eventName, subPath);
    } else {
        logger.info('catalog.json found, downloading bundles without addrtool');
        await downloadJsonBundles(url, eventName, subPath);
    }
}
