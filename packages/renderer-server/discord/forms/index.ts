import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, type BaseMessageOptions } from "discord.js";

export function buildMatchDetailForm(matchId: string, matchDetails: MatchDetails, discordIds: string[]): BaseMessageOptions {
    const select = new StringSelectMenuBuilder()
        .setCustomId("user_select")
        .setPlaceholder("Choose who to clip!")
        .addOptions(
            ...Object.keys(matchDetails.usernames).map(steamId => {
                const kills = matchDetails.kills[steamId];
                const deaths = matchDetails.deaths[steamId];

                return new StringSelectMenuOptionBuilder()
                    .setLabel(matchDetails.usernames[steamId])
                    .setDescription(`K/D: ${kills.length}/${deaths.length}`)
                    .setValue(`${steamId};${matchId}`);
            })
        );
    
    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(select);

    return {
        content: `Woowee, a new match found for ${discordIds.map(id => `<@${id}>`).join(", ")}!`,
        components: [row]
    };
}

export function buildClipTypeForm(steamId: string, matchId: string): BaseMessageOptions {
    const select = new StringSelectMenuBuilder()
        .setCustomId("clip_type")
        .setPlaceholder("Highlights or lowlights?")
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel("Highlight")
                .setDescription("Watch this person shine!")
                .setValue(`${steamId};${matchId};highlight`),
            new StringSelectMenuOptionBuilder()
                .setLabel("Lowlight")
                .setDescription("Watch this person shit the bed!")
                .setValue(`${steamId};${matchId};lowlight`),
            new StringSelectMenuOptionBuilder()
                .setLabel("Highlight From Enemy POV")
                .setDescription("Watch this person's kills from the enemy POV. Or in other words, watch them shit the bed!")
                .setValue(`${steamId};${matchId};highlight-enemy-pov`),
        );
    
    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(select);

    return {
        content: "What type of clip?",
        components: [row]
    }
}