
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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('colorinfo')
        .setDescription('Get detailed information about a hex color')
        .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands)
        .addStringOption(option =>
            option
                .setName('hexcolor')
                .setDescription('Hex color code (e.g., #ff0000 or ff0000)')
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

        const hexInput = interaction.options.getString('hexcolor');
        
        try {
            // Clean and validate hex color
            const hex = hexInput.replace('#', '').toUpperCase();
            
            if (!/^[0-9A-F]{6}$/.test(hex)) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(getErrorColor(interaction.client))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`❌ **Invalid Hex Color Code**\nPlease provide a valid 6-digit hex color code.\n\n**Examples:**\n• #FF0000\n• ff0000\n• #00FF00\n• 0099FF`)
                    );

                return await interaction.reply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true
                });
            }

            const hexWithHash = `#${hex}`;
            const colorInt = parseInt(hex, 16);

            // Convert to RGB
            const rgb = hexToRgb(hexWithHash);
            
            // Convert to HSL
            const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
            
            // Convert to HSV
            const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
            
            // Get color name (basic color detection)
            const colorName = getColorName(rgb);
            
            // Get complementary color
            const complementary = getComplementaryColor(hex);
            
            // Calculate luminance and contrast
            const luminance = calculateLuminance(rgb);
            const brightness = calculateBrightness(rgb);

            // Create the container with the specified color
            const container = new ContainerBuilder()
                .setAccentColor(colorInt);

            // Add header section
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`🎨 **Color Information: ${hexWithHash}**\n**Color Name:** ${colorName}`)
            );

            container.addSeparatorComponents(separator => separator);

            // Add color formats section
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**📊 Color Formats**\n**Hex:** ${hexWithHash}\n**RGB:** rgb(${rgb.r}, ${rgb.g}, ${rgb.b})\n**HSL:** hsl(${hsl.h}°, ${hsl.s}%, ${hsl.l}%)\n**HSV:** hsv(${hsv.h}°, ${hsv.s}%, ${hsv.v}%)`)
            );

            container.addSeparatorComponents(separator => separator);

            // Add color properties section
            const brightnessText = brightness > 127 ? 'Light' : 'Dark';
            const contrastWithWhite = calculateContrastRatio(luminance, 1);
            const contrastWithBlack = calculateContrastRatio(luminance, 0);
            
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**🔍 Color Properties**\n**Brightness:** ${brightness.toFixed(1)} (${brightnessText})\n**Luminance:** ${(luminance * 100).toFixed(2)}%\n**Contrast with White:** ${contrastWithWhite.toFixed(2)}:1\n**Contrast with Black:** ${contrastWithBlack.toFixed(2)}:1`)
            );

            container.addSeparatorComponents(separator => separator);

            // Add complementary color section
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**🔄 Complementary Color**\n**Hex:** #${complementary}\n**RGB:** rgb(${hexToRgb('#' + complementary).r}, ${hexToRgb('#' + complementary).g}, ${hexToRgb('#' + complementary).b})`)
            );

            container.addSeparatorComponents(separator => separator);

            // Add usage recommendations
            const textColor = brightness > 127 ? 'black' : 'white';
            const accessibilityRating = getAccessibilityRating(contrastWithWhite, contrastWithBlack);
            
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**💡 Usage Recommendations**\n**Recommended Text Color:** ${textColor}\n**Accessibility Rating:** ${accessibilityRating}\n**Best Used For:** ${getBestUsage(hsl, brightness)}`)
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
            console.error('Error processing color information:', error);
            
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`❌ **Color Information Failed**\nSorry, I couldn't process the color information. Please try again later.\n\n**Error Details:**\n${error.message || 'Unknown error occurred'}`)
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
        h = s = 0;
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

// Helper function to convert RGB to HSV
function rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h, s, v = max;

    s = max === 0 ? 0 : diff / max;

    if (diff === 0) {
        h = 0;
    } else {
        switch (max) {
            case r: h = ((g - b) / diff + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / diff + 2) / 6; break;
            case b: h = ((r - g) / diff + 4) / 6; break;
        }
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        v: Math.round(v * 100)
    };
}

// Helper function to get basic color name
function getColorName(rgb) {
    const { r, g, b } = rgb;
    
    if (r > 200 && g < 50 && b < 50) return 'Red';
    if (r < 50 && g > 200 && b < 50) return 'Green';
    if (r < 50 && g < 50 && b > 200) return 'Blue';
    if (r > 200 && g > 200 && b < 50) return 'Yellow';
    if (r > 200 && g < 50 && b > 200) return 'Magenta';
    if (r < 50 && g > 200 && b > 200) return 'Cyan';
    if (r > 200 && g > 150 && b < 50) return 'Orange';
    if (r > 150 && g < 50 && b > 150) return 'Purple';
    if (r > 200 && g > 100 && b > 150) return 'Pink';
    if (r < 50 && g < 50 && b < 50) return 'Black';
    if (r > 200 && g > 200 && b > 200) return 'White';
    if (r > 100 && r < 150 && g > 100 && g < 150 && b > 100 && b < 150) return 'Gray';
    if (r > 100 && g > 50 && b < 50) return 'Brown';
    
    return 'Mixed Color';
}

// Helper function to get complementary color
function getComplementaryColor(hex) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    const compR = (255 - r).toString(16).padStart(2, '0').toUpperCase();
    const compG = (255 - g).toString(16).padStart(2, '0').toUpperCase();
    const compB = (255 - b).toString(16).padStart(2, '0').toUpperCase();
    
    return compR + compG + compB;
}

// Helper function to calculate luminance
function calculateLuminance(rgb) {
    const { r, g, b } = rgb;
    const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Helper function to calculate brightness
function calculateBrightness(rgb) {
    const { r, g, b } = rgb;
    return (r * 299 + g * 587 + b * 114) / 1000;
}

// Helper function to calculate contrast ratio
function calculateContrastRatio(lum1, lum2) {
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
}

// Helper function to get accessibility rating
function getAccessibilityRating(whiteContrast, blackContrast) {
    const bestContrast = Math.max(whiteContrast, blackContrast);
    
    if (bestContrast >= 7) return 'AAA (Excellent)';
    if (bestContrast >= 4.5) return 'AA (Good)';
    if (bestContrast >= 3) return 'A (Fair)';
    return 'Poor';
}

// Helper function to suggest best usage
function getBestUsage(hsl, brightness) {
    const { h, s, l } = hsl;
    
    if (s < 20) return 'Neutral backgrounds, text';
    if (l > 80) return 'Light backgrounds, subtle accents';
    if (l < 20) return 'Dark backgrounds, text';
    if (s > 70 && l > 30 && l < 70) return 'Accent colors, buttons, highlights';
    if (h >= 0 && h < 60) return 'Warm accents, call-to-action buttons';
    if (h >= 60 && h < 180) return 'Natural themes, success messages';
    if (h >= 180 && h < 240) return 'Cool themes, info messages';
    if (h >= 240 && h < 300) return 'Creative themes, premium features';
    return 'General purpose, decorative elements';
}
