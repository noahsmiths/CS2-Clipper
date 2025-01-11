// hlae/mirv-scripts/mirvBridge.ts
function waitForClip() {
  return new Promise((res) => {
    mirv.onRecordEnd = () => {
      mirv.onRecordEnd = undefined;
      res();
    };
  });
}
function waitForRoundStart() {
  return new Promise((res) => {
    mirv.onGameEvent = (e) => {
      if (e.name === "round_poststart") {
        mirv.onGameEvent = undefined;
        res();
      }
    };
  });
}
async function recordClip({ demo, outputPath }) {
  mirv.exec(`mirv_cmd clear`);
  mirv.exec(`mirv_streams record name "${outputPath}"`);
  mirv.exec(`mirv_streams record fps ${demo.fps}`);
  mirv.exec(`mirv_streams record screen enabled 1`);
  mirv.exec(`mirv_streams record startMovieWav 1`);
  mirv.exec(`mirv_streams record screen settings afxFfmpeg`);
  mirv.exec(`cl_draw_only_deathnotices true`);
  mirv.exec(`spec_show_xray 0`);
  mirv.exec(`snd_setmixer Dialog vol 0`);
  mirv.exec(`cl_drawhud_force_teamid_overhead -1`);
  mirv.exec(`cl_player_ping_mute 2`);
  mirv.exec(`cl_spec_show_bindings false`);
  mirv.exec(`mp_display_kill_assists false`);
  mirv.exec(`mirv_viewmodel enabled 1; mirv_viewmodel set 2 0 -2 68 0`);
  mirv.exec(`mirv_deathmsg filter clear`);
  mirv.exec(`mirv_deathmsg filter add attackerMatch=!xTrace block=1 lastRule=1`);
  mirv.exec(`playdemo ${demo.id}`);
  await waitForRoundStart();
  mirv.exec(`demoui`);
  for (let i = 0;i < demo.clipIntervals.length; i++) {
    mirv.exec(`mirv_deathmsg clear`);
    mirv.exec(`mirv_cmd clear`);
    mirv.exec(`mirv_cmd addAtTick ${demo.clipIntervals[i].start - 96} spec_player ${demo.clipIntervals[i].playerName}`);
    mirv.exec(`demo_gototick ${demo.clipIntervals[i].start - 96}`);
    mirv.exec(`mirv_cmd addAtTick ${demo.clipIntervals[i].start} mirv_streams record start`);
    mirv.exec(`mirv_cmd addAtTick ${demo.clipIntervals[i].end} mirv_streams record end`);
    mirv.exec(`demo_resume`);
    await waitForClip();
    mirv.exec(`demo_pause`);
  }
  mirv.exec(`mirv_cmd addAtTick ${demo.clipIntervals[demo.clipIntervals.length - 1].end + 128} disconnect`);
  mirv.exec(`mirv_cmd addAtTick ${demo.clipIntervals[demo.clipIntervals.length - 1].end + 128} mirv_cmd clear`);
  mirv.exec(`demo_resume`);
}
function handleMessages(inSocket, outSocket) {
  async function handleIncoming() {
    while (true) {
      const rawMessage = await inSocket.next();
      const message = JSON.parse(rawMessage);
      switch (message.event) {
        case "recordClipRequest":
          recordClip(message.data).then(async () => {
            await outSocket.send(JSON.stringify({
              event: "recordClipResponse",
              data: true
            }));
          }).catch(async () => {
            await outSocket.send(JSON.stringify({
              event: "recordClipResponse",
              data: false
            }));
          });
          break;
      }
    }
  }
  handleIncoming();
}
mirv.connect_async("ws://localhost:2222/").then((ws) => {
  ws.out.send("activated").then(() => {
    handleMessages(ws.in, ws.out);
  }).catch(mirv.message);
}).catch(mirv.message);
