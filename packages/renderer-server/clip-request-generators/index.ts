

// Standard function used for lowlights and highlights
export function calculateIntervals(ticks: number[], steamId: string): ClipInterval[] {
    const STARTING_OFFSET_TICKS = 3 * 64; // 2 seconds converted to ticks
    const ENDING_OFFSET_TICKS = 3 * 64;
    const PRE_KILL_OFFSET = 2 * 64;
    const POST_KILL_OFFSET = 2 * 64;
    const MAX_TICKS_BETWEEN_KILLS = 6 * 64; // If kills are within 6 seconds of each other, don't stop filming between
    const intervals: ClipInterval[] = [];

    // timestamps.sort(); // Might be needed to get kills in correct order

    for (let i = 0; i < ticks.length; i++) {
        const beforeOffset = i === 0 ? STARTING_OFFSET_TICKS : PRE_KILL_OFFSET;
        const afterOffset = i === ticks.length - 1 ? ENDING_OFFSET_TICKS : POST_KILL_OFFSET;

        const currentTime = ticks[i];
        if (currentTime - ticks[i - 1] < MAX_TICKS_BETWEEN_KILLS) { // Kills are within MAX_TICKS_BETWEEN_KILLS of each other
            intervals[intervals.length - 1].end = currentTime + afterOffset;
        } else {
            intervals.push({
                start: currentTime - beforeOffset,
                end: currentTime + afterOffset,
                playerName: steamId
            });
        }
    }

    return intervals;
}

// Generates highlights from victim's POV
export function calculateHighlightsFromEnemyPOV(matchDetails: MatchDetails, steamId: string): ClipInterval[] {
    const STARTING_OFFSET_TICKS = 3 * 64; // 2 seconds converted to ticks
    const ENDING_OFFSET_TICKS = 3 * 64;
    const PRE_KILL_OFFSET = 2 * 64;
    const POST_KILL_OFFSET = 2 * 64;
    const intervals: ClipInterval[] = [];

    // timestamps.sort(); // Might be needed to get kills in correct order

    const kills = matchDetails.kills[steamId];
    for (let i = 0; i < kills.length; i++) {
        const beforeOffset = i === 0 ? STARTING_OFFSET_TICKS : PRE_KILL_OFFSET;
        const afterOffset = i === kills.length - 1 ? ENDING_OFFSET_TICKS : POST_KILL_OFFSET;

        const kill = kills[i];
        intervals.push({
            start: kill[1] - beforeOffset,
            end: kill[1] + afterOffset,
            playerName: kill[0]
        });
    }

    return intervals;
}