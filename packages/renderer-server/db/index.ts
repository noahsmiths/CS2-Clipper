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

export async function getClipURL(matchId: string, extraClipData: string) {
    const rows = await sql`
        SELECT url as "url"
        FROM clips
        WHERE match_id = ${matchId} and extra_clip_data = ${extraClipData}
        LIMIT 1
    ` as { url: string | null}[];
    
    return rows[0]?.url || null;
}

export async function insertClipRequest(matchId: string, extraClipData: string, discordId: string, serverId: string, channelId: string, userLimit: number) {
    const rows = await sql`
        WITH new_clip AS (
            INSERT INTO clips (match_id, extra_clip_data, updated_at)
                SELECT ${matchId}, ${extraClipData}, ${Date.now()}
                WHERE (
                    SELECT COUNT(*)
                    FROM clips as C
                    LEFT JOIN clip_requests as CR ON C.id = CR.clip_id
                    WHERE C.url IS NULL and CR.discord_id = ${discordId}
                ) < ${userLimit}
            ON CONFLICT (match_id, extra_clip_data) DO UPDATE SET match_id = EXCLUDED.match_id
            RETURNING id
        )
        INSERT INTO clip_requests (clip_id, discord_id, server_id, channel_id)
            SELECT id, ${discordId}, ${serverId}, ${channelId}
            FROM new_clip
        ON CONFLICT (clip_id, discord_id, server_id, channel_id) DO UPDATE SET clip_id = EXCLUDED.clip_id
        RETURNING clip_id as "clipId"
    ` as { clipId: string }[];
    return rows[0]?.clipId || null;
    // This query should return a clip_id if either the clip_requests has successfully been created, or it already exists for that user. It will return no clip_id if the clip is past the max specified by userLimit
}

export async function updateClip(matchId: string, extraClipData: string, url: string) {
    await sql`
        UPDATE clips
        SET url = ${url},
            updated_at = ${Date.now()}
        WHERE match_id = ${matchId} and extra_clip_data = ${extraClipData}
    `;
}

export async function getClipRequestsForMatch(matchId: string, extraClipData: string) {
    const rows = await sql`
        SELECT CR.discord_id as "discordId", CR.channel_id as "channelId"
        FROM clip_requests as CR
        INNER JOIN clips as C ON CR.clip_id = C.id
        WHERE C.match_id = ${matchId} and C.extra_clip_data = ${extraClipData}
    ` as { discordId: string, channelId: string }[];
    return rows;
}
