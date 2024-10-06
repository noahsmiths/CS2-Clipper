import { HLAE } from "./hlae/HLAE";

const CONFIG_FILE_PATH = "./config.json";
const configFile = Bun.file(CONFIG_FILE_PATH);

if (await configFile.exists() == false) {
    console.error("Could not find a config.json file. Make sure to copy the template one from the repository and place it in the same directory as this executable.");
    process.exit(1);
}

const config = await configFile.json();

const hlae = new HLAE(config.HLAE_path, config.CS_path);

hlae.launch()
    .then(() => {
        console.log("CS2 Closed without error");
    })
    .catch((err) => {
        console.error("CS2 Close with error: ", err);
    });

console.log("launching");
