import _download from 'download';
import path from 'path';
import fs from 'fs/promises';

export async function download(url: string, dest: string, opts: any = {}): Promise<Buffer | null> {
    try {
        const buf: Buffer = await _download(url, { throwHttpErrors: false, ...opts });

        const text = buf.toString('utf8');
        if (text.startsWith('<!DOCTYPE html') || text.toLowerCase().startsWith('<html')) {
            return null;
        }

        await fs.mkdir(dest, { recursive: true });

        const filename = path.basename(new URL(url).pathname);
        const filepath = path.join(dest, filename);
        await fs.writeFile(filepath, buf);

        return buf;
    } catch {
        return null;
    }
}
