import * as cheerio from 'cheerio';
import axios from 'axios';
import logger from 'signale';
import download from 'download';
import path from 'path';

import type { LolCatalogRoot } from '@interfaces/lolcatalog.interface.ts';
import { TempDir } from '~/index.ts';

export async function getFileBase(url: string) {
    const res = await axios.get(url);

    const data = res.data;

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
}

export async function getCatalog(url: string) {
    const res = await axios.get(url);

    const data = res.data;

    const $ = cheerio.load(data);

    let catalogUrl = '';

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
        }
    });
    return catalogUrl;
}

export async function downloadBundles(url: string, eventName: string, subPath: string) {
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
