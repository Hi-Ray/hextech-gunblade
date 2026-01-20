export interface LolHomepageRoot {
    data: LolData[];
}

export interface LolData {
    title: string;
    navigationItemID: string;
    id: string;
    createdAt: string;
    updatedAt: string;
    products: any[];
    background: Background;
    icon: Icon;
    action: Action;
    endsAt?: string;
}

export interface Background {
    provider: string;
    type: string;
    dimensions: Dimensions;
    url: string;
    mimeType: string;
}

export interface Dimensions {
    height: number;
    width: number;
    aspectRatio: number;
}

export interface Icon {
    provider: string;
    type: string;
    dimensions: Dimensions2;
    url: string;
    mimeType: string;
}

export interface Dimensions2 {
    height: number;
    width: number;
    aspectRatio: number;
}

export interface Action {
    type: string;
    payload: Payload;
}

export interface Payload {
    metagameId?: string;
    url?: string;
    tabId?: string;
}
