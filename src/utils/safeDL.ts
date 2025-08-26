import _download from 'download';

async function safeDownload(url: string, dest: string, opts: any = {}) {
    try {
        return await _download(url, dest, { throwHttpErrors: false, ...opts });
    } catch {
        return Buffer.from('');
    }
}

export const download = safeDownload;
