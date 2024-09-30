const CONFIG_FILE_PATH = "./config.json";
const configFile = Bun.file(CONFIG_FILE_PATH);

if (await configFile.exists() == false) {
    console.error("Could not find a config.json file. Make sure to copy the template one from the repository and place it in the same directory as this executable.");
    process.exit(1);
}

const config = await configFile.json();