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
        stderr: 'pipe',
    });

    // Simulate pressing Enter
    proc.stdin.write('\n');
    proc.stdin.end();

    const stdoutPromise = (async () => {
        let out = '';
        const decoder = new TextDecoder();
        for await (const chunk of proc.stdout) {
            out += decoder.decode(chunk);
        }
        return out;
    })();

    const stderrPromise = (async () => {
        let err = '';
        const decoder = new TextDecoder();
        for await (const chunk of proc.stderr) {
            err += decoder.decode(chunk);
        }
        return err;
    })();

    const [exitCode, stdout, stderr] = await Promise.all([
        proc.exited,
        stdoutPromise,
        stderrPromise,
    ]);

    logger.info('Exiting addressableTools');
    logger.info(stderr);

    logger.info(`Process exited with code ${exitCode}`);

    return stdout;
}
export async function getBinBundles(binData: string) {
    return [
        ...new Set(
            binData
                .split('\n')
                .filter((line) =>
                    line.match(
                        /\{UnityEngine\.AddressableAssets\.Addressables\.RuntimePath\}.*\.bundle/gimu
                    )
                )
                .map(
                    (line) =>
                        line
                            .replaceAll('\r', '')
                            .match(
                                /\{UnityEngine\.AddressableAssets\.Addressables\.RuntimePath\}.*\.bundle/gimu
                            )?.[0] ?? ''
                )
                .filter((line) => line !== '')
        ),
    ];
}
