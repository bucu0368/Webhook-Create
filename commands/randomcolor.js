
const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, MessageFlags } = require('discord.js');

// Helper function to get colors from config
function getEmbedColor(client) {
    const color = client.config?.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

function getErrorColor(client) {
    const color = client.config?.ErrorColor || '#ff0000';
    return parseInt(color.replace('#', ''), 16);
}

function getRandomColor() {
    return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('randomcolor')
        .setDescription('Generate a random color')
        .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands),

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

        try {
            const randomColor = getRandomColor();
            const randomColorInt = parseInt(randomColor.replace('#', ''), 16);

            // Create the container with the random color
            const container = new ContainerBuilder()
                .setAccentColor(randomColorInt);

            // Add header section
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`🎨 **Random Color Generated**\nYour random color is: **${randomColor.toUpperCase()}**`)
            );

            container.addSeparatorComponents(separator => separator);

            // Add color information section
            const rgb = hexToRgb(randomColor);
            const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**🔢 Color Information**\n**Hex:** ${randomColor.toUpperCase()}\n**RGB:** rgb(${rgb.r}, ${rgb.g}, ${rgb.b})\n**HSL:** hsl(${hsl.h}°, ${hsl.s}%, ${hsl.l}%)`)
            );

            container.addSeparatorComponents(separator => separator);

            // Add footer
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`Requested by: ${interaction.user.tag}`)
            );

            await interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Error generating random color:', error);
            
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`❌ **Random Color Generation Failed**\nSorry, I couldn't generate a random color. Please try again later.\n\n**Error Details:**\n${error.message || 'Unknown error occurred'}`)
                );

            await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }
    },
};

// Helper function to convert hex to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// Helper function to convert RGB to HSL
function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}
