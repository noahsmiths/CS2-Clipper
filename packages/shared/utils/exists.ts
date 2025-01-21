import { stat } from "node:fs/promises";

export function exists(filePath: string): Promise<boolean> {
    return new Promise(res => {
        stat(filePath)
            .then(() => {
                res(true);
            })
            .catch(() => {
                res(false);
            })
    });
}