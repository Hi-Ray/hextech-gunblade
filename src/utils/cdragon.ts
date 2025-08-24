import axios from 'axios';
import logger from 'signale';

export async function fetchCdragonLocales() {
    const CdragonUrl =
        'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-l10n/global/default/locales.json';

    const res = await axios.get(CdragonUrl);
    return res.data;
}
