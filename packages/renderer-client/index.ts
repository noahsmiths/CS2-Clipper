import { HLAE } from "./hlae/HLAE";
import { parseConfig } from "./utils/parseConfig";

const CONFIG_FILE_PATH = "./config.json";
const config = await parseConfig(CONFIG_FILE_PATH);
const hlae = new HLAE(config.HLAE_path, config.CS_path);

hlae.launch()
    .then(() => {
        console.log("CS2 Launched without error");
    })
    .catch((err) => {
        console.error("CS2 launch error: ", err);
    });

console.log("launching");
