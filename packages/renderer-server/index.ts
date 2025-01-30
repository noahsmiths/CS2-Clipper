import 'dotenv/config';
import { MatchFetcher } from "./matches/MatchFetcher";
import { sleep } from './utils/sleep';
import * as db from './db';
import { Demos } from './demo/Demo';
import { Discord } from './discord';
import { Connection } from 'rabbitmq-client';
import axios from 'axios';
import { calculateHighlightsFromEnemyPOV, calculateIntervals } from './clip-request-generators';

const matchFetcher = await MatchFetcher.createMatchFetcher();
// const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

if (!process.env.STEAM_API_KEY) {
    throw new Error("No STEAM_API_KEY env variable set!");
}
const demo = new Demos(matchFetcher, process.env.STEAM_API_KEY, 60_000);

if (!process.env.DISCORD_BOT_TOKEN) {
    throw new Error("No DISCORD_BOT_TOKEN env variable set!");
}
const discord = new Discord(process.env.DISCORD_BOT_TOKEN);

if (!process.env.RABBITMQ_URL) {
    throw new Error("No RABBITMQ_URL env variable set!");
}
const rabbit = new Connection(process.env.RABBITMQ_URL);
const pub = rabbit.createPublisher({
    // Enable publish confirmations, similar to consumer acknowledgements
    confirm: true,
    // Enable retries
    maxAttempts: 2,
});
rabbit.on("connection", () => {
    console.log("RabbitMQ connected");
});

demo.on("new-match", async (userIds, matchId, match) => {
    const channelIds: { [channelId: string]: string[] } = {};
    for (const userId of userIds) {
        const discordInfoList = await db.getDiscordIdAndChannelForUser(userId);
        for (const discordInfo of discordInfoList) {
            if (discordInfo.channelId) {
                if (!channelIds.hasOwnProperty(discordInfo.channelId)) {
                    channelIds[discordInfo.channelId] = [];
                }
                channelIds[discordInfo.channelId].push(discordInfo.discordId);
            }
        }
    }

    for (const channelId in channelIds) {
        console.log(`Sending match ${matchId} to ${channelId} for users ${channelIds[channelId]}`);
        await discord.sendMatchToChannel(channelId, matchId, match, channelIds[channelId]);
    }
});

discord.on("clip-request", async (steamId, matchId, clipType, channelId, discordId) => {
    console.log("clip-request-received");
    const url = await matchFetcher.getDemoURLFromMatchId(matchId);
    const matchDetails = await db.getUserMatchDetails(steamId, matchId);

    let intervals: { start: number, end: number, playerName: string }[] = [];
    if (clipType === "highlight") {
        intervals = calculateIntervals(matchDetails.kills, steamId);
    } else if (clipType === "lowlight") {
        intervals = calculateIntervals(matchDetails.deaths, steamId);
    } else if (clipType === "highlight-enemy-pov") {
        intervals = calculateHighlightsFromEnemyPOV(matchDetails, steamId);
    } else {
        throw new Error(`clipType ${clipType} unsupported`);
    }

    const payload: Demo = {
        url: url,
        clipIntervals: intervals,
        fps: 60,
        webhook: "",
        metadata: {
            username: matchDetails.username,
            channelId,
            discordId,
        }
    };
    await pub.send("demos", JSON.stringify(payload));
});

function waitForFullStreamableUpload(url: string) {
    return new Promise<void>((res, rej) => {
        const slug = new URL(url).pathname.substring(1);
        const rejectTimeout = setTimeout(rej, 120_000);

        async function pollUploadStatus() {
            const result = await axios.get(`https://api-f.streamable.com/api/v1/videos/${slug}?version=0`);
            if (result.data.percent === 100) {
                res();
                clearTimeout(rejectTimeout);
            } else {
                setTimeout(() => {
                    pollUploadStatus();
                }, 10_000);
            }
        }

        pollUploadStatus();
    });
}
const sub = rabbit.createConsumer({
    queue: "clips",
    queueOptions: { durable: true, arguments: { "x-queue-type": "quorum", "x-delivery-limit": 5 } },
    qos: { prefetchCount: 3 },
    requeue: true,
}, async (msg) => {
    const clip = JSON.parse(msg.body) as Clip;
    console.log(clip);
    await waitForFullStreamableUpload(clip.url);
    await sleep(10_000);
    await discord.sendClipToChannel(clip.url, clip.metadata.channelId, clip.metadata.discordId);
});
sub.on("error", (err) => {
    console.error(`[RabbitMQ] Sub error: ${err}`);
});

demo.beginPolling();