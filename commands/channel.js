
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');

// Helper function to get colors from config
function getEmbedColor(client) {
    return client.config?.EmbedColor || '#0099ff';
}

function getErrorColor(client) {
    return client.config?.ErrorColor || '#ff0000';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('channel')
        .setDescription('Channel management commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new channel')
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('Channel type')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Text Channel', value: 'text' },
                            { name: 'Voice Channel', value: 'voice' }
                        ))
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Name for the new channel')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a channel')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to delete')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clone')
                .setDescription('Clone a channel with all permissions')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to clone')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('nuke')
                .setDescription('Delete and recreate a channel (keeps all settings)')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to nuke (optional - defaults to current channel)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('lock')
                .setDescription('Lock a channel (remove send message permissions)')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to lock (optional - defaults to current channel)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unlock')
                .setDescription('Unlock a channel (restore send message permissions)')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to unlock (optional - defaults to current channel)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('lockall')
                .setDescription('Lock all text channels in the server'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unlockall')
                .setDescription('Unlock all text channels in the server'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('hide')
                .setDescription('Hide a channel (remove view permissions)')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to hide (optional - defaults to current channel)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unhide')
                .setDescription('Unhide a channel (restore view permissions)')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to unhide (optional - defaults to current channel)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('hideall')
                .setDescription('Hide all channels in the server'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unhideall')
                .setDescription('Unhide all channels in the server')),

    async execute(interaction) {
        // Check user permissions
        const requiredUserPerms = [
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.UseApplicationCommands
        ];

        for (const perm of requiredUserPerms) {
            if (!interaction.member.permissions.has(perm)) {
                return await interaction.reply({
                    content: '❌ You need the "Manage Channels", "View Channel", "Send Messages", and "Use Application Commands" permissions to use this command.',
                    ephemeral: true
                });
            }
        }

        // Check bot permissions
        const requiredBotPerms = [
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.UseApplicationCommands
        ];

        for (const perm of requiredBotPerms) {
            if (!interaction.guild.members.me.permissions.has(perm)) {
                return await interaction.reply({
                    content: '❌ I need the "Manage Channels", "View Channel", "Send Messages", and "Use Application Commands" permissions to execute this command.',
                    ephemeral: true
                });
            }
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'create':
                    await handleCreate(interaction);
                    break;
                case 'delete':
                    await handleDelete(interaction);
                    break;
                case 'clone':
                    await handleClone(interaction);
                    break;
                case 'nuke':
                    await handleNuke(interaction);
                    break;
                case 'lock':
                    await handleLock(interaction);
                    break;
                case 'unlock':
                    await handleUnlock(interaction);
                    break;
                case 'lockall':
                    await handleLockAll(interaction);
                    break;
                case 'unlockall':
                    await handleUnlockAll(interaction);
                    break;
                case 'hide':
                    await handleHide(interaction);
                    break;
                case 'unhide':
                    await handleUnhide(interaction);
                    break;
                case 'hideall':
                    await handleHideAll(interaction);
                    break;
                case 'unhideall':
                    await handleUnhideAll(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown subcommand.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in channel command:', error);
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

async function handleCreate(interaction) {
    await interaction.deferReply();

    const channelType = interaction.options.getString('type');
    const channelName = interaction.options.getString('name');

    try {
        const channelTypeMap = {
            'text': ChannelType.GuildText,
            'voice': ChannelType.GuildVoice
        };

        const newChannel = await interaction.guild.channels.create({
            name: channelName,
            type: channelTypeMap[channelType],
            reason: `Channel created by ${interaction.user.tag} (${interaction.user.id})`
        });

        const successEmbed = new EmbedBuilder()
            .setTitle('✅ Channel Created Successfully')
            .setColor(getEmbedColor(interaction.client))
            .addFields(
                { name: 'Channel', value: `<#${newChannel.id}>`, inline: true },
                { name: 'Type', value: channelType === 'text' ? 'Text Channel' : 'Voice Channel', inline: true },
                { name: 'ID', value: newChannel.id, inline: true },
                { name: 'Created by', value: interaction.user.tag, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
        console.error('Error creating channel:', error);
        await interaction.editReply({
            content: '❌ Failed to create the channel. Please check my permissions and try again.'
        });
    }
}

async function handleDelete(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const targetChannel = interaction.options.getChannel('channel');

    try {
        if (!targetChannel.deletable) {
            return await interaction.editReply({
                content: '❌ I cannot delete this channel. It may be protected or I lack permissions.'
            });
        }

        const channelInfo = {
            name: targetChannel.name,
            type: targetChannel.type,
            id: targetChannel.id
        };

        await targetChannel.delete(`Channel deleted by ${interaction.user.tag} (${interaction.user.id})`);

        const successEmbed = new EmbedBuilder()
            .setTitle('✅ Channel Deleted Successfully')
            .setColor(getEmbedColor(interaction.client))
            .addFields(
                { name: 'Channel Name', value: channelInfo.name, inline: true },
                { name: 'Channel ID', value: channelInfo.id, inline: true },
                { name: 'Deleted by', value: interaction.user.tag, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
        console.error('Error deleting channel:', error);
        await interaction.editReply({
            content: '❌ Failed to delete the channel. Please check my permissions and try again.'
        });
    }
}

async function handleClone(interaction) {
    await interaction.deferReply();

    const sourceChannel = interaction.options.getChannel('channel');

    try {
        const clonedChannel = await sourceChannel.clone({
            name: `${sourceChannel.name}-clone`,
            reason: `Channel cloned by ${interaction.user.tag} (${interaction.user.id})`
        });

        const successEmbed = new EmbedBuilder()
            .setTitle('✅ Channel Cloned Successfully')
            .setColor(getEmbedColor(interaction.client))
            .addFields(
                { name: 'Original Channel', value: `<#${sourceChannel.id}>`, inline: true },
                { name: 'Cloned Channel', value: `<#${clonedChannel.id}>`, inline: true },
                { name: 'Cloned by', value: interaction.user.tag, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
        console.error('Error cloning channel:', error);
        await interaction.editReply({
            content: '❌ Failed to clone the channel. Please check my permissions and try again.'
        });
    }
}

async function handleNuke(interaction) {
    await interaction.deferReply();

    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    try {
        // Store channel information
        const channelData = {
            name: targetChannel.name,
            type: targetChannel.type,
            topic: targetChannel.topic,
            position: targetChannel.position,
            parent: targetChannel.parent,
            permissionOverwrites: targetChannel.permissionOverwrites.cache.clone(),
            nsfw: targetChannel.nsfw,
            rateLimitPerUser: targetChannel.rateLimitPerUser
        };

        // Delete the original channel
        await targetChannel.delete(`Channel nuked by ${interaction.user.tag} (${interaction.user.id})`);

        // Recreate the channel with same settings
        const newChannel = await interaction.guild.channels.create({
            name: channelData.name,
            type: channelData.type,
            topic: channelData.topic,
            position: channelData.position,
            parent: channelData.parent,
            permissionOverwrites: Array.from(channelData.permissionOverwrites.values()),
            nsfw: channelData.nsfw,
            rateLimitPerUser: channelData.rateLimitPerUser,
            reason: `Channel nuked by ${interaction.user.tag} (${interaction.user.id})`
        });

        const successEmbed = new EmbedBuilder()
            .setTitle('💥 Channel Nuked Successfully')
            .setColor(getEmbedColor(interaction.client))
            .addFields(
                { name: 'Channel', value: `<#${newChannel.id}>`, inline: true },
                { name: 'Nuked by', value: interaction.user.tag, inline: true }
            )
            .setTimestamp();

        await newChannel.send({ embeds: [successEmbed] });

    } catch (error) {
        console.error('Error nuking channel:', error);
        
        // If we can't reply to the original channel, try to send to a fallback channel or DM
        try {
            const generalChannel = interaction.guild.channels.cache.find(ch => ch.name === 'general' && ch.type === ChannelType.GuildText);
            const fallbackChannel = generalChannel || interaction.guild.systemChannel || interaction.guild.channels.cache.filter(ch => ch.type === ChannelType.GuildText).first();
            
            if (fallbackChannel) {
                await fallbackChannel.send({
                    content: `❌ Failed to nuke channel. Error occurred while processing the request by ${interaction.user.tag}.`
                });
            }
        } catch {
            // If all else fails, ignore the error
        }
    }
}

async function handleLock(interaction) {
    await interaction.deferReply();

    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    try {
        await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            SendMessages: false
        }, {
            reason: `Channel locked by ${interaction.user.tag} (${interaction.user.id})`
        });

        const successEmbed = new EmbedBuilder()
            .setTitle('🔒 Channel Locked')
            .setColor(getEmbedColor(interaction.client))
            .addFields(
                { name: 'Channel', value: `<#${targetChannel.id}>`, inline: true },
                { name: 'Locked by', value: interaction.user.tag, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
        console.error('Error locking channel:', error);
        await interaction.editReply({
            content: '❌ Failed to lock the channel. Please check my permissions and try again.'
        });
    }
}

async function handleUnlock(interaction) {
    await interaction.deferReply();

    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    try {
        await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            SendMessages: null
        }, {
            reason: `Channel unlocked by ${interaction.user.tag} (${interaction.user.id})`
        });

        const successEmbed = new EmbedBuilder()
            .setTitle('🔓 Channel Unlocked')
            .setColor(getEmbedColor(interaction.client))
            .addFields(
                { name: 'Channel', value: `<#${targetChannel.id}>`, inline: true },
                { name: 'Unlocked by', value: interaction.user.tag, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
        console.error('Error unlocking channel:', error);
        await interaction.editReply({
            content: '❌ Failed to unlock the channel. Please check my permissions and try again.'
        });
    }
}

async function handleLockAll(interaction) {
    await interaction.deferReply();

    try {
        const textChannels = interaction.guild.channels.cache.filter(channel => channel.type === ChannelType.GuildText);
        let lockedCount = 0;
        let failedCount = 0;

        for (const channel of textChannels.values()) {
            try {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    SendMessages: false
                }, {
                    reason: `All channels locked by ${interaction.user.tag} (${interaction.user.id})`
                });
                lockedCount++;
            } catch {
                failedCount++;
            }
        }

        const successEmbed = new EmbedBuilder()
            .setTitle('🔒 Channels Locked')
            .setColor(getEmbedColor(interaction.client))
            .addFields(
                { name: 'Successfully Locked', value: lockedCount.toString(), inline: true },
                { name: 'Failed', value: failedCount.toString(), inline: true },
                { name: 'Locked by', value: interaction.user.tag, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
        console.error('Error locking all channels:', error);
        await interaction.editReply({
            content: '❌ Failed to lock all channels. Please check my permissions and try again.'
        });
    }
}

async function handleUnlockAll(interaction) {
    await interaction.deferReply();

    try {
        const textChannels = interaction.guild.channels.cache.filter(channel => channel.type === ChannelType.GuildText);
        let unlockedCount = 0;
        let failedCount = 0;

        for (const channel of textChannels.values()) {
            try {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    SendMessages: null
                }, {
                    reason: `All channels unlocked by ${interaction.user.tag} (${interaction.user.id})`
                });
                unlockedCount++;
            } catch {
                failedCount++;
            }
        }

        const successEmbed = new EmbedBuilder()
            .setTitle('🔓 Channels Unlocked')
            .setColor(getEmbedColor(interaction.client))
            .addFields(
                { name: 'Successfully Unlocked', value: unlockedCount.toString(), inline: true },
                { name: 'Failed', value: failedCount.toString(), inline: true },
                { name: 'Unlocked by', value: interaction.user.tag, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
        console.error('Error unlocking all channels:', error);
        await interaction.editReply({
            content: '❌ Failed to unlock all channels. Please check my permissions and try again.'
        });
    }
}

async function handleHide(interaction) {
    await interaction.deferReply();

    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    try {
        await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            ViewChannel: false
        }, {
            reason: `Channel hidden by ${interaction.user.tag} (${interaction.user.id})`
        });

        const successEmbed = new EmbedBuilder()
            .setTitle('👁️ Channel Hidden')
            .setColor(getEmbedColor(interaction.client))
            .addFields(
                { name: 'Channel', value: `<#${targetChannel.id}>`, inline: true },
                { name: 'Hidden by', value: interaction.user.tag, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
        console.error('Error hiding channel:', error);
        await interaction.editReply({
            content: '❌ Failed to hide the channel. Please check my permissions and try again.'
        });
    }
}

async function handleUnhide(interaction) {
    await interaction.deferReply();

    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    try {
        await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            ViewChannel: null
        }, {
            reason: `Channel unhidden by ${interaction.user.tag} (${interaction.user.id})`
        });

        const successEmbed = new EmbedBuilder()
            .setTitle('👁️ Channel Unhidden')
            .setColor(getEmbedColor(interaction.client))
            .addFields(
                { name: 'Channel', value: `<#${targetChannel.id}>`, inline: true },
                { name: 'Unhidden by', value: interaction.user.tag, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
        console.error('Error unhiding channel:', error);
        await interaction.editReply({
            content: '❌ Failed to unhide the channel. Please check my permissions and try again.'
        });
    }
}

async function handleHideAll(interaction) {
    await interaction.deferReply();

    try {
        const allChannels = interaction.guild.channels.cache.filter(channel => 
            channel.type === ChannelType.GuildText || 
            channel.type === ChannelType.GuildVoice ||
            channel.type === ChannelType.GuildCategory
        );
        let hiddenCount = 0;
        let failedCount = 0;

        for (const channel of allChannels.values()) {
            try {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    ViewChannel: false
                }, {
                    reason: `All channels hidden by ${interaction.user.tag} (${interaction.user.id})`
                });
                hiddenCount++;
            } catch {
                failedCount++;
            }
        }

        const successEmbed = new EmbedBuilder()
            .setTitle('👁️ Channels Hidden')
            .setColor(getEmbedColor(interaction.client))
            .addFields(
                { name: 'Successfully Hidden', value: hiddenCount.toString(), inline: true },
                { name: 'Failed', value: failedCount.toString(), inline: true },
                { name: 'Hidden by', value: interaction.user.tag, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
        console.error('Error hiding all channels:', error);
        await interaction.editReply({
            content: '❌ Failed to hide all channels. Please check my permissions and try again.'
        });
    }
}

async function handleUnhideAll(interaction) {
    await interaction.deferReply();

    try {
        const allChannels = interaction.guild.channels.cache.filter(channel => 
            channel.type === ChannelType.GuildText || 
            channel.type === ChannelType.GuildVoice ||
            channel.type === ChannelType.GuildCategory
        );
        let unhiddenCount = 0;
        let failedCount = 0;

        for (const channel of allChannels.values()) {
            try {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    ViewChannel: null
                }, {
                    reason: `All channels unhidden by ${interaction.user.tag} (${interaction.user.id})`
                });
                unhiddenCount++;
            } catch {
                failedCount++;
            }
        }

        const successEmbed = new EmbedBuilder()
            .setTitle('👁️ Channels Unhidden')
            .setColor(getEmbedColor(interaction.client))
            .addFields(
                { name: 'Successfully Unhidden', value: unhiddenCount.toString(), inline: true },
                { name: 'Failed', value: failedCount.toString(), inline: true },
                { name: 'Unhidden by', value: interaction.user.tag, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
        console.error('Error unhiding all channels:', error);
        await interaction.editReply({
            content: '❌ Failed to unhide all channels. Please check my permissions and try again.'
        });
    }
}
