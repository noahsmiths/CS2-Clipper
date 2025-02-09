import bz2 from "unbzip2-stream";
import http from "node:http";
import fs from "node:fs";

export function downloadBZip2(url: string, destinationPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        http.get(url, { timeout: 10_000 }, (response) => {
            const writeStream = fs.createWriteStream(destinationPath, { flags: "w", autoClose: true, flush: true });
            const bz2Stream = bz2();

            response.pipe(bz2Stream).pipe(writeStream);

            writeStream.once("close", resolve); // Must close on writestream, not response, or else some bytes can get lost
            response.once("error", reject);
            bz2Stream.once("error", reject);
        })
        .once("error", reject);
    });
}