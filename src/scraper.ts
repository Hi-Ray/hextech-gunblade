import logger from 'signale';
import axios from 'axios';

import { replaceEventPlaceholder, replaceLocalePlaceholder } from '@utils/string.ts';

import type { LolHomepageRoot, LolData } from '@interfaces/lolhomepage.interface.ts';
import type { TftRoot } from '@interfaces/tfthomepage.interface.ts';
import { fetchCdragonLocales } from '@utils/cdragon.ts';
import type { LolEventRoot } from '@interfaces/lolevent.interface.ts';
import type { ScraperData } from '@interfaces/scraper.interface.ts';

// Homepage url.
const homepageUrls = {
    lol: 'https://content.publishing.riotgames.com/publishing-content/v1.0/public/client-navigation/league_client_navigation/?locale={locale}',
    tft: 'https://clientconfig.bangingheads.net/api/v1/config/public?namespace=lol.client_settings.tft',
};

const riotClientManifests = [
    'https://lol.secure.dyn.riotcdn.net/channels/public/rccontent/tft/theme/manifest.json',
    'https://riot-client.secure.dyn.riotcdn.net/channels/public/rccontent/arcane/theme/manifest.json',
    'https://wildrift.secure.dyn.riotcdn.net/channels/public/rccontent/theme/manifest.json',
    'https://valorant.secure.dyn.riotcdn.net/channels/public/rccontent/theme/03/manifest.json',
    'https://bacon.secure.dyn.riotcdn.net/channels/public/rccontent/theme/manifest.json',
    'https://lol.secure.dyn.riotcdn.net/channels/public/rccontent/theme/manifest_default.json',
    'https://riot-client.secure.dyn.riotcdn.net/channels/public/rccontent/theme/manifest_live.json',
];

const eventUrls = {
    lol: 'https://content.publishing.riotgames.com/publishing-content/v2.0/public/channel/league_of_legends_client/page/{event}?locale={locale}',
};

const cdragonLocales = fetchCdragonLocales();

const titleBlacklist = ['Ranked', "What's New", 'Patch Notes'];

/**
 * Parses the TFT Event name from the url.
 *
 * @param str {string} - The url of the event.
 */
export function parseTftEventName(str: string) {
    return str.split('/')[3];
}

/**
 * Get the League of Legends homepages.
 *
 * @returns {Promise<LolData[]>}
 */
export async function getLolHomepages(): Promise<LolData[]> {
    const homepage = replaceLocalePlaceholder(homepageUrls['lol'], 'en_US');

    try {
        const res = await axios.get(homepage);
        const lolHomepage: LolHomepageRoot = res.data;

        const whitelist: LolData[] = [];
        for (const homepagedata of lolHomepage.data) {
            if (titleBlacklist.includes(homepagedata.title)) continue;

            whitelist.push(homepagedata);
        }
        return whitelist;
    } catch {
        const empty: LolData[] = [];
        return empty;
    }
}

/**
 * TODO: When an event occurs make logic for capturing data.
 */
export async function getTftHomePages(): Promise<object> {
    const homepage = replaceLocalePlaceholder(homepageUrls['tft'], 'en_US');

    try {
        const res = await axios.get(homepage);
        const tftHomepage: TftRoot = res.data;
        return {};
    } catch {
        return {};
    }
}

/**
 * Get all homepages and group them together.
 * @returns {
 *   lol: LolData
 * }
 */
export async function getHomepages(): Promise<any> {
    const lolHomepages: LolData[] = await getLolHomepages();
    const tftHomePages = getTftHomePages();

    return {
        lol: lolHomepages,
    };
}

/**
 * Extract the event names
 *
 * @returns {Promise<string[]>}
 */
export async function extractLolEvents(): Promise<string[]> {
    const homepages = await getHomepages();

    const data = [];

    for (const homepage of homepages.lol) {
        if (homepage.action.payload.tabId) {
            const location = homepage.action.payload.tabId;

            data.push(location);
        }
    }

    return data;
}

export async function getLolEvents() {
    const eventNames = await extractLolEvents();

    const events: ScraperData[] = [];

    for (const eventName of eventNames) {
        const event = replaceLocalePlaceholder(
            replaceEventPlaceholder(eventUrls.lol, eventName),
            'en_GB'
        );

        try {
            const res = await axios.get(event);

            const data: LolEventRoot = res.data;
            for (const blade of data.blades) {
                if (!blade.links) {
                    continue;
                }

                for (const link of blade.links) {
                    if (link.action?.type === 'lc_open_metagame') {
                        if (link.action.payload.url) {
                            events.push({
                                eventName: eventName,
                                link: link.action.payload.url.includes('{locale}')
                                    ? replaceLocalePlaceholder(link.action.payload.url, 'en_GB')
                                    : link.action.payload.url,
                                isMinigame: true,
                                subPath: link.action.payload.url.split('/').pop() || '',
                            });
                        }
                    }
                }
            }
        } catch {
            logger.warn(`Could not fetch event: ${eventName}`);
        }
    }
    return events;
}
