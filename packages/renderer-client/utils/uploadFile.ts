import { createReadStream } from "node:fs";
import FormData from "form-data";
import axios from "axios";

export async function uploadFile(url: string, filepath: string) {
    const formData = new FormData();
    formData.append("file", createReadStream(filepath));
    await axios.post(url, formData);
}