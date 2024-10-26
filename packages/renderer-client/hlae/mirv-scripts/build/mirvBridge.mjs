// hlae/mirv-scripts/mirvBridge.ts
function handleMessages(inSocket, outSocket) {
}
mirv.connect_async("ws://localhost:2222/").then((ws) => {
  handleMessages(ws.in, ws.out);
}).catch((err) => {
  mirv.message(err);
});
