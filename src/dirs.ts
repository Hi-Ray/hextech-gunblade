import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const ExportDir =
    process.env.EXPORT_DIR && process.env.EXPORT_DIR.trim() !== ''
        ? process.env.EXPORT_DIR
        : path.join(__dirname, '../events/');

export const ASDir =
    process.env.AS_DIR && process.env.AS_DIR.trim() !== ''
        ? process.env.AS_DIR
        : path.join(__dirname, '../asset-studio/');

export const TempDir =
    process.env.TEMP_DIR && process.env.TEMP_DIR.trim() !== ''
        ? process.env.TEMP_DIR
        : path.join(__dirname, '../tmp/');
