import axios from 'axios';

let data = {};

export async function fetchCdragonLocales() {
    if (Object.keys(data).length !== 0) {
        return data;
    }

    const CdragonUrl =
        'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-l10n/global/default/locales.json';

    const res = await axios.get(CdragonUrl);

    data = res.data;

    return res.data;
}
