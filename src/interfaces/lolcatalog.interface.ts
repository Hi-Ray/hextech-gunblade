export interface LolCatalogRoot {
    m_LocatorId: string;
    m_BuildResultHash: string;
    m_InstanceProviderData: MInstanceProviderData;
    m_SceneProviderData: MSceneProviderData;
    m_ResourceProviderData: MResourceProviderDaum[];
    m_ProviderIds: string[];
    m_InternalIds: string[];
    m_KeyDataString: string;
    m_BucketDataString: string;
    m_EntryDataString: string;
    m_ExtraDataString: string;
    m_resourceTypes: MResourceType[];
    m_InternalIdPrefixes: any[];
}

export interface MInstanceProviderData {
    m_Id: string;
    m_ObjectType: MObjectType;
    m_Data: string;
}

export interface MObjectType {
    m_AssemblyName: string;
    m_ClassName: string;
}

export interface MSceneProviderData {
    m_Id: string;
    m_ObjectType: MObjectType2;
    m_Data: string;
}

export interface MObjectType2 {
    m_AssemblyName: string;
    m_ClassName: string;
}

export interface MResourceProviderDaum {
    m_Id: string;
    m_ObjectType: MObjectType3;
    m_Data: string;
}

export interface MObjectType3 {
    m_AssemblyName: string;
    m_ClassName: string;
}

export interface MResourceType {
    m_AssemblyName: string;
    m_ClassName: string;
}
