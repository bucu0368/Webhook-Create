
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        // Ignore messages from bots
        if (message.author.bot) return;

        // Check if the bot was mentioned
        if (message.mentions.has(message.client.user)) {
            try {
                // Create buttons row
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('Invite Bot')
                            .setURL(`https://discord.com/api/oauth2/authorize?client_id=${message.client.config.clientId}&permissions=8&scope=bot%20applications.commands`)
                            .setStyle(ButtonStyle.Link),
                        new ButtonBuilder()
                            .setLabel('Support Server')
                            .setURL(message.client.config.SupportServerLink)
                            .setStyle(ButtonStyle.Link)
                    );

                // Create embed
                const embed = new EmbedBuilder()
                    .setTitle("Hi, i'm Bot")
                    .setDescription(`Use with commands via Discord / commands`)
                    .setColor(message.client.config.EmbedColor || '#0099ff')
                    .addFields([
                        {
                            name: "📨┆Invite me",
                            value: `Invite Bot in your own server! [Click here](https://discord.com/api/oauth2/authorize?client_id=${message.client.config.clientId}&permissions=8&scope=bot%20applications.commands)`,
                            inline: false
                        },
                        {
                            name: "❓┇I don't see any slash commands",
                            value: "The bot may not have permissions for this. Open the invite link again and select your server. The bot then gets the correct permissions",
                            inline: false
                        },
                        {
                            name: "❓┆Need support?",
                            value: `For questions you can join our [support server](${message.client.config.SupportServerLink})!`,
                            inline: false
                        },
                        {
                            name: "🐞┆Error?",
                            value: `Error Feedback: \`/bot feedback\`!`,
                            inline: false
                        }
                    ])
                    .setThumbnail(message.client.user.displayAvatarURL())
                    .setFooter({ 
                text: `Requested by: ${message.author.username}`,
                iconURL: message.author.displayAvatarURL()
            })
            .setTimestamp();

                // Send the embed
                await message.channel.send({
                    embeds: [embed],
                    components: [row]
                });

            } catch (error) {
                console.error('Error sending ping response:', error);
            }
        }
    },
};
