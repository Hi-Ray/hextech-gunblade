import { mkdirSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import logger from 'signale';

export async function copyRecursive(src: string, dest: string, exclude: string = '') {
    if (!existsSync(dest)) {
        mkdirSync(dest, { recursive: true });
    }

    const items = readdirSync(src, { withFileTypes: true });

    for (const item of items) {
        if (exclude && item.name === exclude) {
            continue;
        }

        const srcPath = path.join(src, item.name);
        const destPath = path.join(dest, item.name);

        if (item.isDirectory()) {
            await copyRecursive(srcPath, destPath);
        } else {
            try {
                const file = Bun.file(srcPath);
                await Bun.write(destPath, file);
            } catch (err: any) {
                logger.error(`Failed to copy ${item.name}: ${err.message}`);
            }
        }
    }
}
