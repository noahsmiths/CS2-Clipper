declare interface User {
    steamId: string,
    authCode: string,
    matchId: string,
}

declare interface MatchesWithUsers {
    [matchId: string]: string[],
}

declare interface MatchDetails {
    usernames: { [steamID: string] : string },
    kills: { [steamID: string]: [victimSteamID: string, tick: number][] },
    deaths: { [steamID: string]: [attackerSteamID: string, tick: number][] },
    map: string,
    winningSteamIDs: number[],
    losingSteamIDs: number[],
}