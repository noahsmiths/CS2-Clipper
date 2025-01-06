declare type Demo = {
    id: string,
    url: string,
    clipIntervals: Array<{
        start: number,
        end: number,
        playerName: string,
    }>,
    fps: number
}

declare type MirvMessage = {
    event: string,
    data: any
}