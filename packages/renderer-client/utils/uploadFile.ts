import { createReadStream } from "node:fs";
import FormData from "form-data";
import axios from "axios";
import path from "node:path";

export async function uploadFile(url: string, filepath: string) {
    const formData = new FormData();
    formData.append("file", createReadStream(filepath));
    await axios.post(url, formData);
}

export async function uploadFileToStreamable(uploadName: string, filepath: string) {
    const file = Bun.file(filepath);
    console.log(file.size);

    const res = await axios.get(`https://api-f.streamable.com/api/v1/uploads/shortcode?size=${file.size}&version=unknown`);
    let sessionCookie = "";
    if (res.headers["set-cookie"] && res.headers["set-cookie"].length > 0) {
        sessionCookie = res.headers["set-cookie"][0].split(" ")[0];
    }

    await axios.post(`https://api-f.streamable.com/api/v1/videos/${res.data.video.shortcode}/initialize`, {
        original_name: path.basename(filepath),
        original_size: file.size,
        title: uploadName,
        upload_source: "web"
    }, {
        headers: {
            "Cookie": sessionCookie
        }
    });
    
    const client = new Bun.S3Client({
        accessKeyId: res.data.credentials.accessKeyId,
        secretAccessKey: res.data.credentials.secretAccessKey,
        sessionToken: res.data.credentials.sessionToken
    });

    await client.write(res.data.key, file, {
        bucket: res.data.bucket,
        acl: "public-read"
    });

    await axios.post(`https://api-f.streamable.com/api/v1/transcode/${res.data.shortcode}`, {
        ...res.data.transcoder_options,
        upload_source: "web",
    }, {
        headers: {
            "Cookie": sessionCookie
        }
    });
    
    return res.data.video.url;
}