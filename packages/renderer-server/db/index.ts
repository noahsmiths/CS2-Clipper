import sql from "./connection";

export async function getUsersAndMatchIds() {
    const usersAndCodes = await sql`SELECT steam_id as "steamId", cs_auth_code as "authCode", match_id as "matchId" FROM users;` as User[];
    return usersAndCodes;
}

export async function upsertNewMatchDetails(matchId: string, matchDetails: MatchDetails) {
    const stringifiedMatchDetails = JSON.stringify(matchDetails);
    await sql`INSERT INTO match_data (match_id, match_details) VALUES (${matchId}, ${stringifiedMatchDetails}) ON CONFLICT (match_id) DO UPDATE SET match_details = ${stringifiedMatchDetails};`;
}

export async function updateUserMatchIds(steamId: string, matchId: string) {
    await sql`UPDATE users SET match_id = ${matchId} WHERE steam_id = ${steamId}`;
}

export async function getDiscordIdAndChannelForUser(steamId: string) {
    const rows = await sql`SELECT U.discord_id as "discordId", D.channel_id as "channelId" FROM users as U LEFT JOIN discord_channels as D ON U.steam_id = D.steam_id WHERE D.steam_id = ${steamId};` as { discordId: string, channelId: string }[];
    return rows;
}

export async function getMatchDetails(matchId: string) {
    const rows = await sql`SELECT match_details as "matchDetails" FROM match_data WHERE match_id = ${matchId}` as { matchDetails: string }[];
    return JSON.parse(rows[0].matchDetails) as MatchDetails;
}