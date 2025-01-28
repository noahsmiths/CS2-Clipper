export async function parseConfig(configPath: string) {
    const configFile = Bun.file(configPath);

    if (await configFile.exists() == false) {
        console.error("Could not find a config.json file. Make sure to copy the template one from the repository and place it in the same directory as this executable.");
        process.exit(1);
    }

    return await configFile.json() as {
        HLAE_path: string,
        CS_path: string,
        clip_path: string,
        RABBITMQ_URL: string,
        DEMO_CACHE_LIMIT: number,
        DEMO_CLIP_RESOLUTION: {
            width: number,
            height: number
        },
        SHUTDOWN_CS_AFTER_MS: number
    };
}