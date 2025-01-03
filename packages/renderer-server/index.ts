import 'dotenv/config';
import { MatchFetcher } from "./matches/MatchFetcher";

const matchFetcher = await MatchFetcher.createMatchFetcher();

const matchURL = await matchFetcher.getDemoURLFromMatchId("CSGO-Q3dUy-oWPE8-ZdFcG-EOqMd-FPGCF");
console.log(matchURL);