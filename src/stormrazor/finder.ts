import { md5HashEncode } from '@utils/crypto';

import fs from 'fs-extra';
import path from 'path';

import logger from 'signale';

/**
 * Filters the files for legitimate files from the potential files.
 *
 * @async
 * @param exportDir {string} Directory to export to.
 * @param potentialFiles {string[]} Potential files found.
 * @returns {Promise<string[]>} The found files.
 */
export const findFiles = async (exportDir: string, potentialFiles: string[]): Promise<string[]> => {
    // Using regex in handle to filter instead of this function for now

    const foundFiles = potentialFiles.filter(
        (file) =>
            file.includes('lib-embed') ||
            file.match(/svgs?/gimu) ||
            file.match(/videos?/gimu) ||
            file.match(/images?/gimu) ||
            file.match(/sounds?/gimu)
    );

    await fs.writeFile(path.join(exportDir, 'files.txt'), foundFiles.join('\n'), { flag: 'a' });

    // Log amount of found files
    logger.info(`Found ${foundFiles.length} potential assets files.`);

    return foundFiles;
};

/**
 * Finds SVGs from data provided.
 *
 * @async
 * @param exportDir Directory to export file names to (will be saved under "files.txt").
 * @param fileData {string} File data.
 * @returns {Promise<string[]>} Found files.
 */
export const findSvgs = async (exportDir: string, fileData: string): Promise<string[]> => {
    const svgRegex = /<svg\b[^>]*?(?:viewBox="(\b[^"]*)")?>([\s\S]*?)<\/svg>/gimu;

    const matches = fileData.match(svgRegex) ?? [];

    const fileNames = matches.map((file) => `${md5HashEncode(file)}.svg`);

    logger.info(`Found ${matches.length} SVGs.`);

    if (matches.length !== 0)
        await fs.writeFile(path.join(exportDir, 'files.txt'), fileNames.join('\n'), { flag: 'a' });

    return matches ?? [];
};
