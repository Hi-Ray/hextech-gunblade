export interface TftRoot {
    'lol.client_settings.tft.cap_missions_enabled': boolean;
    'lol.client_settings.tft.tft_battle_pass_hub': LolClientSettingsTftTftBattlePassHub;
    'lol.client_settings.tft.tft_claimall_enabled': boolean;
    'lol.client_settings.tft.tft_content_retiering': LolClientSettingsTftTftContentRetiering;
    'lol.client_settings.tft.tft_content_retiering_loot_deprecation': LolClientSettingsTftTftContentRetieringLootDeprecation;
    'lol.client_settings.tft.tft_events': LolClientSettingsTftTftEvents;
    'lol.client_settings.tft.tft_home_hub': LolClientSettingsTftTftHomeHub;
    'lol.client_settings.tft.tft_loadouts_favorites_max': LolClientSettingsTftTftLoadoutsFavoritesMax;
    'lol.client_settings.tft.tft_loadouts_sortByLastAcquired': boolean;
    'lol.client_settings.tft.tft_loadouts_v2_enabled': boolean;
    'lol.client_settings.tft.tft_news_hub': LolClientSettingsTftTftNewsHub;
    'lol.client_settings.tft.tft_playbook': LolClientSettingsTftTftPlaybook;
    'lol.client_settings.tft.tft_randomize_loadouts': LolClientSettingsTftTftRandomizeLoadouts;
    'lol.client_settings.tft.tft_rotational_shop': LolClientSettingsTftTftRotationalShop;
    'lol.client_settings.tft.tft_store_disclaimer': LolClientSettingsTftTftStoreDisclaimer;
    'lol.client_settings.tft.tft_tastes_experiment_enabled': boolean;
    'lol.client_settings.tft.tft_teamPlanner_endOfGameImport': boolean;
    'lol.client_settings.tft.tft_teamPlanner_teamCodes': boolean;
    'lol.client_settings.tft.tft_team_planner': LolClientSettingsTftTftTeamPlanner;
    'lol.client_settings.tft.tft_troves': LolClientSettingsTftTftTroves;
}

export interface LolClientSettingsTftTftBattlePassHub {
    battlePassXPBoosted: boolean;
}

export interface LolClientSettingsTftTftContentRetiering {
    disabledContent: any[];
    disabledFeature: any[];
    disabledRarity: any[];
    disabledScene: any[];
    disabledTag: any[];
    enabled: boolean;
}

export interface LolClientSettingsTftTftContentRetieringLootDeprecation {
    postModalEnabled: boolean;
    preModalEnabled: boolean;
}

export interface LolClientSettingsTftTftEvents {
    promoButtons: any[];
    subNavTabs: any[];
}

export interface LolClientSettingsTftTftHomeHub {
    enabled: boolean;
    overrideUrl: string;
    rotatingShopPromos: RotatingShopPromos;
    tacticianPromoOfferIds: string[];
}

export interface RotatingShopPromos {
    fallbackPromo: FallbackPromo;
    firstPromos: FirstPromo[];
    secondPromos: SecondPromo[];
}

export interface FallbackPromo {
    bundleId: string;
    id: string;
    storeType: string;
}

export interface FirstPromo {
    id: string;
    storeType: string;
}

export interface SecondPromo {
    id: string;
    storeType: string;
}

export interface LolClientSettingsTftTftLoadoutsFavoritesMax {
    max: number;
}

export interface LolClientSettingsTftTftNewsHub {
    enabled: boolean;
    url: string;
}

export interface LolClientSettingsTftTftPlaybook {
    enabled: boolean;
}

export interface LolClientSettingsTftTftRandomizeLoadouts {
    enabled: boolean;
}

export interface LolClientSettingsTftTftRotationalShop {
    enabled: boolean;
}

export interface LolClientSettingsTftTftStoreDisclaimer {
    enabled: boolean;
}

export interface LolClientSettingsTftTftTeamPlanner {
    enabled: boolean;
    globalNameSanitizationEnabled: boolean;
    multipleSetsEnabled: boolean;
    multipleTeamsEnabled: boolean;
    traitFilteringEnabled: boolean;
}

export interface LolClientSettingsTftTftTroves {
    bannerList: BannerList[];
    enabled: boolean;
    tokensItemId: number;
    tokensOfferId: string;
}

export interface BannerList {
    comment: string;
    id: string;
    version: number;
}
