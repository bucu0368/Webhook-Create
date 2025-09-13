const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');

// Helper function to get colors from config
function getEmbedColor(client) {
    return client.config?.EmbedColor;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Server information commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Show detailed server information'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('icon')
                .setDescription('Show the server icon with download links')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'info':
                    await handleServerInfo(interaction);
                    break;
                case 'icon':
                    await handleServerIcon(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown subcommand.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in server command:', error);
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

async function handleServerInfo(interaction) {
    await interaction.deferReply();
    
    const guild = interaction.guild;
    
    try {
        // Fetch additional guild information
        const fetchedGuild = await guild.fetch();
        
        // Count different channel types
        const channels = await guild.channels.fetch();
        const textChannels = channels.filter(channel => channel.type === ChannelType.GuildText).size;
        const voiceChannels = channels.filter(channel => channel.type === ChannelType.GuildVoice).size;
        const categoryChannels = channels.filter(channel => channel.type === ChannelType.GuildCategory).size;
        const totalChannels = textChannels + voiceChannels + categoryChannels;

        // Get member counts
        const totalMembers = guild.memberCount;
        const onlineMembers = guild.members.cache.filter(member => member.presence?.status !== 'offline').size;

        // Get boost information
        const boostLevel = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount || 0;
        const boostersCount = guild.members.cache.filter(member => member.premiumSince).size;

        // Get emoji information
        const totalEmojis = guild.emojis.cache.size;
        const staticEmojis = guild.emojis.cache.filter(emoji => !emoji.animated).size;
        const animatedEmojis = guild.emojis.cache.filter(emoji => emoji.animated).size;

        // Get roles count
        const rolesCount = guild.roles.cache.size;

        // Format creation date
        const createdAt = Math.floor(guild.createdAt.getTime() / 1000);

        // Build features list
        const features = guild.features.length > 0 ? guild.features.map(feature => {
            return feature.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }).join(', ') : 'None';

        const embed = new EmbedBuilder()
            .setTitle(`${guild.name} Server Information`)
            .setColor(getEmbedColor(interaction.client))
            .setThumbnail(guild.iconURL({ size: 256 }))
            .setTimestamp()
            .setFooter({ text: `Server ID: ${guild.id}` });

        // Add fields as specified by user
        embed.addFields(
            {
                name: `**__Server Roles__ [ ${rolesCount} ]**`,
                value: `Total roles in this server: **${rolesCount}**`,
                inline: true
            },
            {
                name: '**__Boost Status__**',
                value: `**Level:** ${boostLevel}\n**Boosts:** ${boostCount}\n**Boosters:** ${boostersCount}`,
                inline: true
            },
            {
                name: '**__Emoji Info__**',
                value: `**Total:** ${totalEmojis}\n**Static:** ${staticEmojis}\n**Animated:** ${animatedEmojis}`,
                inline: true
            },
            {
                name: '**__Channels__**',
                value: `**Total:** ${totalChannels}\n**Text:** ${textChannels}\n**Voice:** ${voiceChannels}\n**Categories:** ${categoryChannels}`,
                inline: true
            },
            {
                name: '**__Features__**',
                value: features.length > 1024 ? features.substring(0, 1021) + '...' : features,
                inline: true
            },
            {
                name: '**__General Stats__**',
                value: `**Total Members:** ${totalMembers}\n**Online:** ${onlineMembers}\n**Created:** <t:${createdAt}:R>`,
                inline: true
            }
        );

        // Add description if it exists
        if (guild.description) {
            embed.addFields({
                name: '**__Description__**',
                value: guild.description,
                inline: false
            });
        }

        // Add about section
        const owner = await guild.fetchOwner();
        embed.addFields({
            name: '**__About__**',
            value: `**Owner:** ${owner.user.tag}\n**Region:** ${guild.preferredLocale || 'Unknown'}\n**Verification Level:** ${getVerificationLevel(guild.verificationLevel)}`,
            inline: false
        });

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error fetching server info:', error);
        await interaction.editReply({
            content: '❌ Failed to fetch server information.'
        });
    }
}

async function handleServerIcon(interaction) {
    const guild = interaction.guild;
    
    if (!guild.icon) {
        return await interaction.reply({
            content: '❌ This server doesn\'t have an icon set.',
            ephemeral: true
        });
    }

    try {
        // Get different formats of the server icon
        const iconPNG = guild.iconURL({ size: 1024, extension: 'png' });
        const iconJPG = guild.iconURL({ size: 1024, extension: 'jpg' });
        const iconWEBP = guild.iconURL({ size: 1024, extension: 'webp' });

        const embed = new EmbedBuilder()
            .setTitle(`${guild.name}'s Server Icon`)
            .setColor(getEmbedColor(interaction.client))
            .setDescription(`[**PNG**](${iconPNG}) | [**JPG**](${iconJPG}) | [**WEBP**](${iconWEBP})`)
            .setImage(iconPNG)
            .setTimestamp()
            .setFooter({ text: `Server ID: ${guild.id}` });

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        console.error('Error fetching server icon:', error);
        await interaction.reply({
            content: '❌ Failed to fetch the server icon.',
            ephemeral: true
        });
    }
}

function getVerificationLevel(level) {
    const levels = {
        0: 'None',
        1: 'Low',
        2: 'Medium',
        3: 'High',
        4: 'Very High'
    };
    return levels[level] || 'Unknown';
}