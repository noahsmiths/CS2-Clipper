// hlae/mirv-scripts/mirvBridge.ts
function handleMessages(inSocket, outSocket) {
}
mirv.connect_async("ws://localhost:2222/").then((ws) => {
  ws.out.send("activated").then(() => {
    handleMessages(ws.in, ws.out);
  }).catch(mirv.message);
}).catch(mirv.message);
