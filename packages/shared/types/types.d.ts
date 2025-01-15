declare type Demo = {
    id: string,
    url: string,
    clipIntervals: Array<{
        start: number,
        end: number,
        playerName: string,
    }>,
    fps: number,
    webhook: string,
}

declare type MirvMessage = {
    event: string,
    data: any
}