# renderer-server
 The server for the renderer. This runs on a separate server and effectively manages a pool of renderer-client's.
 
 Requests are sent here from the other api with the demo and the time(s) that should be clipped, and this will delegate it to a server and then send it back