import { TempDir } from '../dirs.ts';
import path from 'path';
import os from 'os';
import download from 'download';
import extract from 'extract-zip';
import logger from 'signale';

const toolsLocation = path.join(TempDir, 'addressabletools');
const fileName = `addrtool-example-${getAddressableToolsOs()}.zip`;
const toolsUrl = `https://github.com/nesrak1/AddressablesTools/releases/download/v2pr1/${fileName}`;

export function getAddressableToolsOs() {
    switch (os.platform()) {
        case 'win32':
            return 'windows';
        case 'linux':
            return 'ubuntu';
        default:
            throw new Error('Unsupported OS');
    }
}

export async function getAddressableTools() {
    logger.info('Downloading AddressableTools');
    await download(toolsUrl, toolsLocation);
}

export async function unzipAddressableTools() {
    logger.info('Unzipping AddressableTools');
    await extract(path.join(toolsLocation, fileName), { dir: toolsLocation });
}

export async function useAddressableTools(binFile: string) {
    logger.info('Using AddressableTools');
    const exe = os.platform() === 'win32' ? '.exe' : '';

    const proc = Bun.spawn([path.join(toolsLocation, `Example${exe}`), 'searchasset', binFile], {
        stdin: 'pipe',
        stdout: 'pipe',
        stderr: 'inherit',
    });

    proc.stdin.write('\n');
    proc.stdin.end();

    const output = await new Response(proc.stdout).text();

    const exitCode = await proc.exited;

    logger.info(`Exiting addressableTools, exit code ${exitCode}`);

    if (exitCode !== 0) {
        throw new Error(`AddressableTools failed with output: ${output}`);
    }

    return output.trim();
}

export async function getBinBundles(binData: string) {
    const regex = /\{UnityEngine\.AddressableAssets\.Addressables\.RuntimePath\}.*?\.bundle/gimu;
    const matches = binData.match(regex) || [];

    return [...new Set(matches.map((m) => m.replace(/\r/g, '')))];
}
