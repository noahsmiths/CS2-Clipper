export async function parseConfig(configPath: string) {
    const configFile = Bun.file(configPath);

    if (await configFile.exists() == false) {
        console.error("Could not find a config.json file. Make sure to copy the template one from the repository and place it in the same directory as this executable.");
        process.exit(1);
    }

    return await configFile.json();
}