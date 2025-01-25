import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, type BaseMessageOptions } from "discord.js";

export function buildMatchDetailForm(matchId: string, match: Match): BaseMessageOptions {
    const select = new StringSelectMenuBuilder()
        .setCustomId("user_select")
        .setPlaceholder("Choose who to clip!")
        .addOptions(
            ...Object.keys(match).map(steamId => {
                const stats = match[steamId];

                return new StringSelectMenuOptionBuilder()
                    .setLabel(stats.username)
                    .setValue(`${steamId};${matchId}`);
            })
        );
    
    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(select);

    return {
        content: "New match detected!",
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
        );
    
    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(select);

    return {
        content: "What type of clip?",
        components: [row]
    }
}