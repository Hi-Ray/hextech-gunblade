import fs from 'fs/promises';
import path from 'path';

/**
 * Recursively search for files whose names include a substring.
 * Returns absolute file paths.
 *
 * @param {string} dir - Directory to search
 * @param {string} substring - Substring to look for in filenames
 * @returns {Promise<string[]>} - An array of absolute file paths
 */
export async function findFilesContaining(dir: string, substring: string): Promise<string[]> {
    let results: string[] = [];
    const absDir = path.resolve(dir); // make sure base dir is absolute
    const entries = await fs.readdir(absDir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(absDir, entry.name);

        if (entry.isDirectory()) {
            results = results.concat(await findFilesContaining(fullPath, substring));
        } else if (entry.isFile() && entry.name.includes(substring)) {
            results.push(fullPath);
        }
    }

    return results;
}
