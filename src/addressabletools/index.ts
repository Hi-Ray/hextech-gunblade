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
    await download(toolsUrl, toolsLocation);
}

export async function unzipAddressableTools() {
    await extract(path.join(toolsLocation, fileName), { dir: toolsLocation });
}

export async function useAddressableTools(binFile: string) {
    const exe = os.platform() === 'win32' ? '.exe' : '';
    const proc = Bun.spawn([path.join(toolsLocation, `example${exe}`), binFile], {
        stdout: 'pipe',
        stderr: 'pipe',
    });

    const chunks = [];

    for await (const chunk of proc.stdout) {
        chunks.push(chunk);
    }

    const fullOutput = new TextDecoder().decode(Buffer.concat(chunks));

    logger.info(fullOutput);

    logger.info(`Process exited with code ${await proc.exited}`);

    return fullOutput;
}

export async function getBinBundles(binData: string) {
    return binData
        .split('\n')
        .filter(
            (line) =>
                line.startsWith('{UnityEngine.AddressableAssets.Addressables.RuntimePath}') &&
                line.endsWith('.bundle')
        );
}
