
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
        .setName('shorten')
        .setDescription('Shorten a URL using URL shortener service')
        .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands)
        .addStringOption(option =>
            option
                .setName('url')
                .setDescription('The URL to shorten')
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

        const url = interaction.options.getString('url');
        
        // Basic URL validation
        try {
            new URL(url);
        } catch {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ **Invalid URL**\nPlease provide a valid URL (must include http:// or https://)')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            // Using TinyURL API as a reliable alternative
            const apiUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`;
            console.log('Making request to:', apiUrl);
            
            // Add timeout using AbortController
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Discord Bot'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                const errorText = await response.text();
                console.log('Error response body:', errorText);
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }

            const responseText = await response.text();
            console.log('Raw response:', responseText);
            
            // TinyURL returns the shortened URL directly as text
            if (!responseText || responseText.includes('Error') || !responseText.startsWith('http')) {
                throw new Error(`Invalid response from TinyURL: ${responseText}`);
            }
            
            const shortenedUrl = responseText.trim();

            // Create success container
            const container = new ContainerBuilder()
                .setAccentColor(getEmbedColor(interaction.client));

            // Add header section
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('🔗 **URL Shortened Successfully**\nYour long URL has been shortened!')
            );

            container.addSeparatorComponents(separator => separator);

            // Add original URL section
            container.addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**Original URL:**\n${url.length > 100 ? url.substring(0, 97) + '...' : url}`)
                    )
                    .setButtonAccessory(
                        button => button
                            .setLabel('Open Original')
                            .setStyle(ButtonStyle.Link)
                            .setURL(url)
                    )
            );

            container.addSeparatorComponents(separator => separator);

            // Add shortened URL section
            container.addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**Shortened URL:**\n${shortenedUrl}`)
                    )
                    .setButtonAccessory(
                        button => button
                            .setLabel('Open Shortened')
                            .setStyle(ButtonStyle.Link)
                            .setURL(shortenedUrl)
                    )
            );

            container.addSeparatorComponents(separator => separator);

            // Add footer
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`Requested by: ${interaction.user.tag}`)
            );

            await interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Error shortening URL:', error);
            
            let errorMessage = '❌ **URL Shortening Failed**\nSorry, I couldn\'t shorten that URL. Please try again later.';
            
            if (error.name === 'AbortError') {
                errorMessage = '❌ **Request Timeout**\nThe URL shortening service is taking too long to respond. Please try again later.';
            } else if (error.message.includes('fetch')) {
                errorMessage = '❌ **Network Error**\nCannot connect to the URL shortening service. The service might be down.';
            } else if (error.message.includes('JSON')) {
                errorMessage = '❌ **Invalid Response**\nThe URL shortening service returned an invalid response.';
            }
            
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`${errorMessage}\n\n**Error Details:**\n${error.message || 'Unknown error occurred'}`)
                );

            await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },
};
