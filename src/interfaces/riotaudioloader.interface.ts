export interface RiotAudioLoaderRoot {
    m_GameObject: MGameObject;
    m_Enabled: number;
    m_Script: MScript;
    m_Name: string;
    _nameList: string[];
    _extList: string[];
    _nameLocalizedList: string[];
    _extLocalizedList: string[];
}

export interface MGameObject {
    m_FileID: number;
    m_PathID: number;
}

export interface MScript {
    m_FileID: number;
    m_PathID: number;
}
