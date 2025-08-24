export interface LolEventRoot {
    title: string;
    type: string;
    id: string;
    translationId: string;
    locale: string;
    blades: LolBlade[];
    analytics: Analytics;
}

export interface LolBlade {
    backgroundType?: string;
    templateType?: string;
    mastheadAlignment?: string;
    type: string;
    backdrop?: Backdrop;
    header?: Header;
    helpLink?: HelpLink;
    leagueClientTabContentGroups?: LeagueClientTabContentGroup[];
    footerLinks?: FooterLink[];
    alignment?: string;
    title?: string;
    links?: Link[];
}

export interface Backdrop {
    background: Background;
}

export interface Background {
    provider: string;
    type: string;
    sources: Source[];
    dimensions: Dimensions;
    thumbnail: Thumbnail;
}

export interface Source {
    src: string;
    type: string;
}

export interface Dimensions {
    width: number;
    height: number;
}

export interface Thumbnail {
    provider: string;
    type: string;
    dimensions: Dimensions2;
    url: string;
    colors: Colors;
    mimeType: string;
}

export interface Dimensions2 {
    height: number;
    width: number;
    aspectRatio: number;
}

export interface Colors {
    primary: string;
    secondary: string;
    label: string;
}

export interface Header {
    title: string;
    supertitle: string;
    media: Media;
    description: Description;
}

export interface Media {
    provider: string;
    type: string;
    dimensions: Dimensions3;
    url: string;
    colors: Colors2;
    mimeType: string;
}

export interface Dimensions3 {
    height: number;
    width: number;
    aspectRatio: number;
}

export interface Colors2 {
    primary: string;
    secondary: string;
    label: string;
}

export interface Description {
    type: string;
    body: string;
}

export interface HelpLink {
    title: string;
    displayType: string;
    action: Action;
}

export interface Action {
    type: string;
    requiresAuthentication: boolean;
    payload: Payload;
}

export interface Payload {
    url: string;
}

export interface LeagueClientTabContentGroup {
    hasCampaignTracker: boolean;
    tabLabel: string;
    ctas: Cta[];
    campaignTracker: CampaignTracker;
}

export interface Cta {
    title: string;
    displayType: string;
    action: Action2;
    media: Media2;
}

export interface Action2 {
    type: string;
    payload: Payload2;
}

export interface Payload2 {
    title: string;
    language: string;
    inventoryType: string;
    itemId: string;
}

export interface Media2 {
    provider: string;
    type: string;
    dimensions: Dimensions4;
    url: string;
    colors: Colors3;
    mimeType: string;
}

export interface Dimensions4 {
    height: number;
    width: number;
    aspectRatio: number;
}

export interface Colors3 {
    primary: string;
    secondary: string;
    label: string;
}

export interface CampaignTracker {
    type: string;
    campaignId?: string;
    gameType?: string;
    campaignTrackerType?: string;
    shouldOpenCampaignTracker: boolean;
    isPersistThroughCampaign: boolean;
    eventPassType?: string;
}

export interface FooterLink {
    title: string;
    displayType: string;
    action: Action3;
}

export interface Action3 {
    type: string;
    payload: Payload3;
}

export interface Payload3 {
    eventId: string;
}

export interface Link {
    title: string;
    displayType?: string;
    action?: Action4;
    media?: Media3;
}

export interface Action4 {
    type: string;
    payload: Payload4;
}

export interface Payload4 {
    iframeId?: string;
    url: string;
    iframeModalType?: string;
    metagameId?: string;
}

export interface Media3 {
    provider: string;
    type: string;
    dimensions: Dimensions5;
    url: string;
    colors: Colors4;
    mimeType: string;
}

export interface Dimensions5 {
    height: number;
    width: number;
    aspectRatio: number;
}

export interface Colors4 {
    primary: string;
    secondary: string;
    label: string;
}

export interface Analytics {
    contentId: string;
    contentLocale: string;
    rev: string;
    publishDate: string;
}
