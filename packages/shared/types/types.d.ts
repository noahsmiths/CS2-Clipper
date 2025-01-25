declare type Demo = {
    id?: string,
    url: string,
    clipIntervals: Array<{
        start: number,
        end: number,
        playerName: string,
    }>,
    fps: number,
    webhook: string,
    metadata?: any
}

declare type MirvMessage = {
    event: string,
    data: any
}

declare type Clip = {
    url: string,
    metadata?: any
}