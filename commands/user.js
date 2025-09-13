const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Helper function to get colors from config
function getEmbedColor(client) {
    return client.config?.EmbedColor;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('User information commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('avatar')
                .setDescription('Show a user\'s avatar')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user whose avatar to show')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('banner')
                .setDescription('Show a user\'s banner')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user whose banner to show')
                        .setRequired(false))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'avatar':
                    await handleAvatar(interaction);
                    break;
                case 'banner':
                    await handleBanner(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown subcommand.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in user command:', error);
            const reply = {
                content: '❌ An error occurred while executing the command.',
                ephemeral: true
            };
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    },
};

async function handleAvatar(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    
    try {
        // Get different sizes of the avatar
        const avatar512 = targetUser.displayAvatarURL({ size: 512, extension: 'png' });
        const avatar1024 = targetUser.displayAvatarURL({ size: 1024, extension: 'png' });
        const avatar2048 = targetUser.displayAvatarURL({ size: 2048, extension: 'png' });

        const embed = new EmbedBuilder()
            .setTitle(`${targetUser.tag}'s Avatar`)
            .setColor(getEmbedColor(interaction.client))
            .setDescription(`**Download Links:**\n[512x512](${avatar512}) | [1024x1024](${avatar1024}) | [2048x2048](${avatar2048})`)
            .setImage(avatar1024)
            .setTimestamp()
            .setFooter({ text: `User ID: ${targetUser.id}` });

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        console.error('Error fetching avatar:', error);
        await interaction.reply({
            content: '❌ Failed to fetch the user\'s avatar.',
            ephemeral: true
        });
    }
}

async function handleBanner(interaction) {
    await interaction.deferReply();
    
    const targetUser = interaction.options.getUser('user') || interaction.user;
    
    try {
        // Fetch the full user object to get banner info
        const fullUser = await interaction.client.users.fetch(targetUser.id, { force: true });
        
        if (!fullUser.banner) {
            return await interaction.editReply({
                content: `❌ ${targetUser.tag} doesn't have a banner set.`
            });
        }

        // Get different sizes of the banner
        const banner512 = fullUser.bannerURL({ size: 512, extension: 'png' });
        const banner1024 = fullUser.bannerURL({ size: 1024, extension: 'png' });
        const banner2048 = fullUser.bannerURL({ size: 2048, extension: 'png' });

        const embed = new EmbedBuilder()
            .setTitle(`${targetUser.tag}'s Banner`)
            .setColor(getEmbedColor(interaction.client))
            .setDescription(`**Download Links:**\n[512x512](${banner512}) | [1024x1024](${banner1024}) | [2048x2048](${banner2048})`)
            .setImage(banner1024)
            .setTimestamp()
            .setFooter({ text: `User ID: ${targetUser.id}` });

        // If the user has a banner color instead of an image
        if (fullUser.hexAccentColor) {
            embed.addFields({ name: 'Accent Color', value: fullUser.hexAccentColor, inline: true });
        }

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error fetching banner:', error);
        await interaction.editReply({
            content: '❌ Failed to fetch the user\'s banner.'
        });
    }
}