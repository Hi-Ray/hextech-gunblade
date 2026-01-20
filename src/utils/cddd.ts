import logger from 'signale';
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

// Stats & Thresholds
let totalBytes = 0;
let fileCount = 0;
let errorCount = 0;
const startTime = Date.now();
const SPEED_THRESHOLD_MB = 5.0;

function getSpeed() {
    const durationSeconds = (Date.now() - startTime) / 1000;
    const mb = totalBytes / (1024 * 1024);
    return mb / Math.max(durationSeconds, 1);
}

export const downloadFile = async (url: string, filepath: string) => {
    if (existsSync(filepath)) return;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0', Connection: 'close' },
            signal: controller.signal,
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const buffer = await response.arrayBuffer();
        totalBytes += buffer.byteLength;
        fileCount++;

        await Bun.write(filepath, buffer);
    } finally {
        clearTimeout(timer);
    }
};

const downloadDirectory = async (url: string, dest: string, currentPath: string = '') => {
    const basePath = path.resolve(dest);
    const normalizedUrl = url.endsWith('/') ? url : `${url}/`;

    const currentSpeed = getSpeed();
    if (fileCount > 10 && currentSpeed < SPEED_THRESHOLD_MB) {
        logger.warn(`Speed dropped to ${currentSpeed.toFixed(2)} MB/s. Cooldown for 3s...`);
        await new Promise((r) => setTimeout(r, 3000));
    }

    const urlObj = new URL(normalizedUrl);
    urlObj.pathname = `/json${urlObj.pathname.replace(/\/+$/, '')}`;

    try {
        const listResponse = await fetch(urlObj.toString());
        if (!listResponse.ok) return;
        const data: any = await listResponse.json();

        const currentFolder = path.join(basePath, currentPath);
        if (!existsSync(currentFolder)) mkdirSync(currentFolder, { recursive: true });

        const files = data.filter((item: any) => item.type === 'file');
        const directories = data.filter((item: any) => item.type === 'directory');

        const MAX_CONCURRENT = 2;
        for (let i = 0; i < files.length; i += MAX_CONCURRENT) {
            const chunk = files.slice(i, i + MAX_CONCURRENT);

            await Promise.all(
                chunk.map(async (file: { name: string }) => {
                    const fileUrl = `${normalizedUrl}${encodeURIComponent(file.name)}`;
                    const filePath = path.join(currentFolder, file.name);
                    try {
                        await downloadFile(fileUrl, filePath);
                        logger.info(`[${getSpeed().toFixed(2)} MB/s] ✓ ${file.name}`);
                    } catch {
                        errorCount++;
                        logger.error(`[Skip] ${file.name}`);
                    }
                })
            );
        }

        for (const dir of directories) {
            await downloadDirectory(
                `${normalizedUrl}${encodeURIComponent(dir.name)}/`,
                dest,
                path.join(currentPath, dir.name)
            );
        }
    } catch {
        logger.error(`Failed to list directory: ${normalizedUrl}`);
    }
    console.log(`Files:       ${fileCount}`);
    console.log(`Errors:      ${errorCount}`);
};

export default downloadDirectory;
