
const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Helper function to get colors from config
function getEmbedColor(client) {
    const color = client.config?.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

function getErrorColor(client) {
    const color = client.config?.ErrorColor || '#ff0000';
    return parseInt(color.replace('#', ''), 16);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('github')
        .setDescription('Get GitHub user information')
        .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands)
        .addStringOption(option =>
            option
                .setName('username')
                .setDescription('GitHub username to lookup')
                .setRequired(true)),

    async execute(interaction) {
        // Check if user has required permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            return await interaction.reply({
                content: '❌ You need "Use Application Commands" permission to use this command.',
                ephemeral: true
            });
        }

        // Check if bot has required permissions
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            return await interaction.reply({
                content: '❌ I need "Use Application Commands" permission to execute this command.',
                ephemeral: true
            });
        }

        const username = interaction.options.getString('username');
        
        await interaction.deferReply();

        try {
            const response = await fetch(`https://api.github.com/users/${username}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    const errorContainer = new ContainerBuilder()
                        .setAccentColor(getErrorColor(interaction.client))
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent(`❌ **GitHub User Not Found**\nUser **${username}** was not found on GitHub.`)
                        );

                    return await interaction.editReply({ 
                        components: [errorContainer], 
                        flags: MessageFlags.IsComponentsV2 
                    });
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const userData = await response.json();

            // Create the main container
            const container = new ContainerBuilder()
                .setAccentColor(getEmbedColor(interaction.client));

            // Add header section
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`🐙 **GitHub Profile: ${userData.login}**\n${userData.name ? `**Name:** ${userData.name}` : '**Name:** Not specified'}`)
            );

            container.addSeparatorComponents(separator => separator);

            // Add profile information section
            const profileInfo = [
                `**Bio:** ${userData.bio || 'Not specified'}`,
                `**Location:** ${userData.location || 'Not specified'}`,
                `**Company:** ${userData.company || 'Not specified'}`,
                `**Blog:** ${userData.blog || 'Not specified'}`,
                `**Twitter:** ${userData.twitter_username ? `@${userData.twitter_username}` : 'Not specified'}`
            ].join('\n');

            container.addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**📋 Profile Information**\n${profileInfo}`)
                    )
                    .setThumbnailAccessory(
                        thumbnail => thumbnail
                            .setURL(userData.avatar_url)
                    )
            );

            container.addSeparatorComponents(separator => separator);

            // Add statistics section
            const stats = [
                `**Public Repos:** ${userData.public_repos.toLocaleString()}`,
                `**Followers:** ${userData.followers.toLocaleString()}`,
                `**Following:** ${userData.following.toLocaleString()}`,
                `**Public Gists:** ${userData.public_gists.toLocaleString()}`
            ].join('\n');

            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**📊 GitHub Statistics**\n${stats}`)
            );

            container.addSeparatorComponents(separator => separator);

            // Add account information
            const accountCreated = new Date(userData.created_at);
            const accountUpdated = new Date(userData.updated_at);
            
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**📅 Account Information**\n**Created:** <t:${Math.floor(accountCreated.getTime() / 1000)}:F>\n**Last Updated:** <t:${Math.floor(accountUpdated.getTime() / 1000)}:R>`)
            );

            container.addSeparatorComponents(separator => separator);

            // Add action buttons section
            container.addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**🔗 Quick Actions**\nView profile or invite our bot to your server!`)
                    )
                    .setButtonAccessory(
                        button => button
                            .setLabel('View GitHub Profile')
                            .setStyle(ButtonStyle.Link)
                            .setURL(userData.html_url)
                    )
            );

            // Add footer with buttons
            container.addActionRowComponents(
                actionRow => actionRow
                    .setComponents(
                        new ButtonBuilder()
                            .setLabel('Invite Bot')
                            .setStyle(ButtonStyle.Link)
                            .setURL(`https://discord.com/oauth2/authorize?client_id=${interaction.client.config.clientId}&permissions=8&scope=bot%20applications.commands`),
                        new ButtonBuilder()
                            .setLabel('Join Server')
                            .setStyle(ButtonStyle.Link)
                            .setURL(interaction.client.config.SupportServerLink)
                    )
            );

            // Add footer text
            container.addSeparatorComponents(separator => separator);
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`Requested by: ${interaction.user.tag}`)
            );

            await interaction.editReply({ 
                components: [container], 
                flags: MessageFlags.IsComponentsV2 
            });

        } catch (error) {
            console.error('Error fetching GitHub user:', error);
            
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`❌ **GitHub Lookup Failed**\nSorry, I couldn't fetch information for **${username}**. Please try again later.\n\n**Error Details:**\n${error.message || 'Unknown error occurred'}`)
                );

            await interaction.editReply({ 
                components: [errorContainer], 
                flags: MessageFlags.IsComponentsV2 
            });
        }
    },
};
