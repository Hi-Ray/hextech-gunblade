export function getAllValues(obj: any, values: any[] = []) {
    if (obj !== null && typeof obj === 'object') {
        if (Array.isArray(obj)) {
            for (const item of obj) {
                getAllValues(item, values);
            }
        } else {
            for (const key in obj) {
                getAllValues(obj[key], values);
            }
        }
    } else {
        values.push(obj);
    }
    return values;
}
