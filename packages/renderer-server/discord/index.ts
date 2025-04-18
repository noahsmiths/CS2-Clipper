import { ActionRowBuilder, ChannelType, Client, Events, GatewayIntentBits, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, type CacheType, type Interaction } from "discord.js";
import { EventEmitter } from "node:events";
import { buildClipTypeForm, buildMatchDetailForm } from "./forms";
import * as db from "../db";

export class Discord extends EventEmitter {
    private client;

    constructor(
        token: string
    ) {
        super();

        const client = new Client({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
        });
        client.on(Events.InteractionCreate, this.handleInteraction.bind(this));
        client.once(Events.ClientReady, () => {
            this.emit("ready");
        });
        client.login(token);

        this.client = client;
    }

    async sendMatchToChannel(channelId: string, matchId: string, matchDetails: MatchDetails, discordIds: string[]) {
        const channel = await this.client.channels.fetch(channelId);
        if (channel?.type === ChannelType.GuildText) {
            const message = buildMatchDetailForm(matchId, matchDetails, discordIds);
            await channel.send(message);
        } else {
            throw new Error(`Channel ID: ${channelId} is of type ${channel?.type}, not GuildText`);
        }
    }

    async sendClipToChannel(url: string, channelId: string, discordId: string) {
        const channel = await this.client.channels.fetch(channelId);
        if (channel?.type === ChannelType.GuildText) {
            await channel.send(`Clip generated <@${discordId}>! [Link here](${url})`);
        } else {
            throw new Error(`Channel ID: ${channelId} is of type ${channel?.type}, not GuildText`);
        }
    }

    async sendClipRequestConfirmationToChannel(discordId: string, channelId: string, steamUsername: string, clipType: string) {
        const channel = await this.client.channels.fetch(channelId);
        if (channel?.type === ChannelType.GuildText) {
            await channel.send(`<@${discordId}> requested ${steamUsername}'s ${clipType}s. Coming soon!`);
        } else {
            throw new Error(`Channel ID: ${channelId} is of type ${channel?.type}, not GuildText`);
        }
    }

    private async handleInteraction(interaction: Interaction<CacheType>) {
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === "user_select") {
                const [steamId, matchId] = interaction.values[0].split(";");
                interaction.reply({
                    ...buildClipTypeForm(steamId, matchId),
                    flags: "Ephemeral"
                });
            } else if (interaction.customId === "clip_type") {
                const [steamId, matchId, clipType] = interaction.values[0].split(";");
                const defferedReply = await interaction.deferReply();
                const reply = async function(content: string) {
                    await defferedReply.edit(content);
                }
                this.emit("clip-request", steamId, matchId, clipType, interaction.channelId, interaction.guildId || "no_server", interaction.user.id, reply);
            }
        }
    }
}

// const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

// async function onDiscordReady() {
//     const channel = await client.channels.fetch("1331406960792178779");
//     if (channel?.type === ChannelType.GuildText) {
//         // channel.send("Hi");
//         const select = new StringSelectMenuBuilder()
//             .setCustomId("clip")
//             .setPlaceholder("Choose what to clip!")
//             .addOptions(
//                 new StringSelectMenuOptionBuilder()
//                     .setLabel('Bulbasaur')
//                     .setDescription('The dual-type Grass/Poison Seed Pokémon.')
//                     .setValue('bulbasaur'),
//                 new StringSelectMenuOptionBuilder()
//                     .setLabel('Charmander')
//                     .setDescription('The Fire-type Lizard Pokémon.')
//                     .setValue('charmander'),
//                 new StringSelectMenuOptionBuilder()
//                     .setLabel('Squirtle')
//                     .setDescription('The Water-type Tiny Turtle Pokémon.')
//                     .setValue('squirtle'),
//             );

//         const select2 = new StringSelectMenuBuilder()
//             .setCustomId("clip2")
//             .setPlaceholder("Choose what to clip!")
//             .addOptions(
//                 new StringSelectMenuOptionBuilder()
//                     .setLabel('Bulbasaur')
//                     .setDescription('The dual-type Grass/Poison Seed Pokémon.')
//                     .setValue('bulbasaur'),
//                 new StringSelectMenuOptionBuilder()
//                     .setLabel('Charmander')
//                     .setDescription('The Fire-type Lizard Pokémon.')
//                     .setValue('charmander'),
//                 new StringSelectMenuOptionBuilder()
//                     .setLabel('Squirtle')
//                     .setDescription('The Water-type Tiny Turtle Pokémon.')
//                     .setValue('squirtle'),
//             );

//         const row = new ActionRowBuilder<StringSelectMenuBuilder>()
//             .addComponents(select);

//         const row2 = new ActionRowBuilder<StringSelectMenuBuilder>()
//             .addComponents(select2);

//         channel.send({
//             content: "Here's some content",
//             components: [row, row2]
//         });
//     }
// }

// client.on(Events.InteractionCreate, interaction => {
//     if (interaction.isStringSelectMenu()) {
//         console.log(interaction.values);
//         console.log(interaction.customId);
//         interaction.reply({
//             content: "Hi",
//             flags: "Ephemeral"
//         });
//     }
// });

// client.once(Events.ClientReady, readyClient => {
//     console.log(`Ready! Logged in as ${readyClient.user.tag}`);
//     onDiscordReady();
// });

// // Log in to Discord with your client's token
// client.login(process.env.DISCORD_BOT_TOKEN);