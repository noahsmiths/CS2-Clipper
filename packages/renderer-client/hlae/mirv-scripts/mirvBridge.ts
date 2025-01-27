// function sleep(timeMS: number) {
//     return new Promise(res => setTimeout(res, timeMS));
// }

function waitForMainMenu() {
    return new Promise<void>((res) => {
        mirv.onGameEvent = (e) => {
            if (e.name === "game_newmap") {
                mirv.onGameEvent = undefined;
                res();
            }
        }
    });
}

function waitForClip() {
    return new Promise<void>((res) => {
        mirv.onRecordEnd = () => {
            mirv.onRecordEnd = undefined;
            res();
        }
    });
}

const nameAndSteamIDToUserID: {[key : string]: string} = {};

/**
 * This is an IMPORTANT function. Not only does it wait for round start, but it also populates the nameToUserID field that is necessary for spec_player
 */
function waitForRoundStart() {
    return new Promise<void>((res) => {
        mirv.onGameEvent = (e) => {
            if (e.name === "player_info") {
                const data = JSON.parse(e.data);
                const steamIdStartIndex = e.data.indexOf("steamid") + 10;
                const steamId = e.data.substring(steamIdStartIndex, steamIdStartIndex + 17);

                if (!data.bot && 0 <= data.userid && data.userid <= 9) {
                    nameAndSteamIDToUserID[data.name] = data.userid + 1;
                    nameAndSteamIDToUserID[steamId] = data.userid + 1;
                }
            } else if (e.name === "round_poststart") {
                mirv.message(JSON.stringify(nameAndSteamIDToUserID));
                mirv.onGameEvent = undefined;
                res();
            }
        }
    });
}

async function recordClip({demo, outputPath}: {demo: Demo, outputPath: string}) {
    mirv.exec(`mirv_cmd clear`);
    mirv.exec(`mirv_streams record name "${outputPath}"`);
    mirv.exec(`mirv_streams record fps ${demo.fps}`);
    mirv.exec(`mirv_streams record screen enabled 1`);
    mirv.exec(`mirv_streams record startMovieWav 1`);
    // mirv.exec(`mirv_streams settings add ffmpeg mp4 "-c:v libx264 -pix_fmt yuv420p -preset ultrafast -crf 9 {QUOTE}{AFX_STREAM_PATH}\\video.mp4{QUOTE}"`);
    // mirv.exec(`mirv_streams settings add sampler blur`);
    // mirv.exec(`mirv_streams settings edit blur settings mp4`);
    // mirv.exec(`mirv_streams settings edit blur strength 1`);
    // mirv.exec(`mirv_streams settings edit blur method rectangle`);
    // mirv.exec(`mirv_streams settings edit blur exposure ${(0.7 * (demo.fps / 60)).toFixed(2)}`);
    // mirv.exec(`mirv_streams settings edit blur fps ${demo.fps}`);
    // mirv.exec(`mirv_streams record fps ${demo.fps * 10}`);
    // mirv.exec(`mirv_streams record screen settings blur`);
    mirv.exec(`mirv_streams settings add ffmpeg gpuEncoding "-c:v h264_nvenc -preset slow -cq 19 {QUOTE}{AFX_STREAM_PATH}\\\\video.mp4{QUOTE}"`);
    mirv.exec(`mirv_streams record screen settings gpuEncoding`);
    mirv.exec(`cl_draw_only_deathnotices true`);
    mirv.exec(`spec_show_xray 0`);
    mirv.exec(`snd_setmixer Dialog vol 0`);
    mirv.exec(`cl_drawhud_force_teamid_overhead -1`);
    mirv.exec(`cl_player_ping_mute 2`);
    mirv.exec(`cl_spec_show_bindings false`);
    mirv.exec(`cl_drawhud_force_radar -1`);
    mirv.exec(`mp_display_kill_assists false`);
    mirv.exec(`mirv_viewmodel enabled 1; mirv_viewmodel set 2 0 -2 68 0`);
    mirv.exec(`r_show_build_info false`);

    mirv.exec(`playdemo ${demo.id}`);

    await waitForRoundStart();
    mirv.exec(`demoui`);

    for (let i = 0; i < demo.clipIntervals.length; i++) {
        const playerID = nameAndSteamIDToUserID[demo.clipIntervals[i].playerName];
        if (playerID === undefined) continue;

        const offset = i === 0 ? 128 : 96; // Different pre-clip offsets for if it's the first clip or not. First clip needs to load a little more, so it's 128 ticks (2 seconds)

        mirv.exec(`mirv_deathmsg clear`);
        mirv.exec(`mirv_deathmsg filter clear`);
        mirv.exec(`mirv_deathmsg filter add attackerMatch=!${+playerID - 1} block=1 lastRule=1`);
        mirv.exec(`mirv_cmd clear`);
        mirv.exec(`mirv_cmd addAtTick ${demo.clipIntervals[i].start - offset} spec_player ${playerID}`);
        mirv.exec(`demo_gototick ${demo.clipIntervals[i].start - offset}`); // Go to 1.5 seconds before clip start
        mirv.exec(`mirv_cmd addAtTick ${demo.clipIntervals[i].start} mirv_streams record start`);
        mirv.exec(`mirv_cmd addAtTick ${demo.clipIntervals[i].end} mirv_streams record end`);
        mirv.exec(`demo_resume`);
        await waitForClip();
        mirv.exec(`demo_pause`);
    }

    mirv.exec(`mirv_cmd addAtTick ${demo.clipIntervals[demo.clipIntervals.length - 1].end + 128} disconnect`); // Disconnect 2 seconds after done
    mirv.exec(`mirv_cmd addAtTick ${demo.clipIntervals[demo.clipIntervals.length - 1].end + 128} mirv_cmd clear`);
    mirv.exec(`demo_resume`);

    await waitForMainMenu();
}

function handleMessages(inSocket: mirv.WsIn, outSocket: mirv.WsOut) {
    async function handleIncoming() {
        while (true) {
            try {
                const rawMessage = await inSocket.next() as string;
                const message = JSON.parse(rawMessage) as MirvMessage;

                switch (message.event) {
                    case "recordClipRequest":
                        recordClip(message.data)
                            .then(async () => {
                                await outSocket.send(JSON.stringify({
                                    event: "recordClipResponse",
                                    data: true
                                }));
                            })
                            .catch(async () => {
                                await outSocket.send(JSON.stringify({
                                    event: "recordClipResponseError",
                                    data: false
                                }));
                            });
                        break;
                }
            } catch (err) {
                mirv.message(`Error in handleIncoming: ${err}\n`);
            }
        }
    }

    handleIncoming();
}

mirv.connect_async("ws://localhost:2222/")
    .then((ws) => {
        mirv.message("--------------------------------------------------CONNECTED TO WS--------------------------------------------------\n");
        ws.out.send("activated")
            .then(() => {
                handleMessages(ws.in, ws.out);
            })
            .catch(mirv.message);
    })
    .catch(mirv.message);