const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

// Helper function to get colors from config
function getEmbedColor(client) {
    return client.config?.EmbedColor;
}

function getErrorColor(client) {
    return client.config?.ErrorColor;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('emoji')
        .setDescription('Emoji management commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
        .addSubcommand(subcommand =>
            subcommand
                .setName('steal')
                .setDescription('Steal an emoji from a message or URL')
                .addStringOption(option =>
                    option
                        .setName('emoji')
                        .setDescription('The emoji to steal (custom emoji or URL)')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Name for the emoji (optional)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('upload')
                .setDescription('Upload a new emoji from an attachment')
                .addAttachmentOption(option =>
                    option
                        .setName('attachment')
                        .setDescription('The image file to upload as emoji')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Name for the emoji')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete an emoji from the server')
                .addStringOption(option =>
                    option
                        .setName('emoji')
                        .setDescription('The emoji to delete (name or emoji itself)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Get information about an emoji')
                .addStringOption(option =>
                    option
                        .setName('emoji')
                        .setDescription('The emoji to get info about')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('image')
                .setDescription('Display emoji image in 4096 resolution')
                .addStringOption(option =>
                    option
                        .setName('emoji')
                        .setDescription('The emoji to display image for')
                        .setRequired(true))),

    async execute(interaction) {
        // Check if user has manage emojis permission
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
            return await interaction.reply({
                content: '❌ You need the "Manage Emojis and Stickers" permission to use this command.',
                ephemeral: true
            });
        }

        // Check if bot has manage emojis permission
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
            return await interaction.reply({
                content: '❌ I need the "Manage Emojis and Stickers" permission to execute this command.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'steal':
                    await handleSteal(interaction);
                    break;
                case 'upload':
                    await handleUpload(interaction);
                    break;
                case 'delete':
                    await handleDelete(interaction);
                    break;
                case 'info':
                    await handleInfo(interaction);
                    break;
                case 'image':
                    await handleImage(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown subcommand.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in emoji command:', error);
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

async function handleSteal(interaction) {
    await interaction.deferReply();

    const emojiInput = interaction.options.getString('emoji');
    const customName = interaction.options.getString('name');

    try {
        let emojiUrl = null;
        let emojiName = customName;

        // Check if it's a custom Discord emoji
        const customEmojiRegex = /<a?:([^:]+):(\d+)>/;
        const customEmojiMatch = emojiInput.match(customEmojiRegex);

        if (customEmojiMatch) {
            // It's a custom Discord emoji
            const [, name, id] = customEmojiMatch;
            const isAnimated = emojiInput.startsWith('<a:');
            const extension = isAnimated ? 'gif' : 'png';
            emojiUrl = `https://cdn.discordapp.com/emojis/${id}.${extension}`;
            emojiName = emojiName || name;
        } else if (emojiInput.startsWith('http')) {
            // It's a direct URL
            emojiUrl = emojiInput;
            if (!emojiName) {
                return await interaction.editReply({
                    content: '❌ Please provide a name for the emoji when using a direct URL.'
                });
            }
        } else {
            return await interaction.editReply({
                content: '❌ Invalid emoji format. Please provide a custom Discord emoji or a direct image URL.'
            });
        }

        // Validate emoji name
        if (!emojiName || emojiName.length < 2 || emojiName.length > 32) {
            return await interaction.editReply({
                content: '❌ Emoji name must be between 2 and 32 characters long.'
            });
        }

        // Check if emoji with this name already exists
        const existingEmoji = interaction.guild.emojis.cache.find(emoji => emoji.name === emojiName);
        if (existingEmoji) {
            return await interaction.editReply({
                content: `❌ An emoji with the name "${emojiName}" already exists.`
            });
        }

        // Create the emoji
        const newEmoji = await interaction.guild.emojis.create({
            attachment: emojiUrl,
            name: emojiName,
            reason: `Emoji stolen by ${interaction.user.tag} (${interaction.user.id})`
        });

        const successEmbed = new EmbedBuilder()
            .setTitle('✅ Emoji Stolen Successfully')
            .setColor(getEmbedColor(interaction.client))
            .addFields(
                { name: 'Emoji', value: `${newEmoji}`, inline: true },
                { name: 'Name', value: newEmoji.name, inline: true },
                { name: 'ID', value: newEmoji.id, inline: true },
                { name: 'Added by', value: interaction.user.tag, inline: true }
            )
            .setThumbnail(newEmoji.url)
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
        console.error('Error stealing emoji:', error);
        let errorMessage = '❌ Failed to steal the emoji.';

        if (error.code === 50035) {
            errorMessage = '❌ Invalid image format. Please use a valid image URL.';
        } else if (error.code === 50013) {
            errorMessage = '❌ I don\'t have permission to manage emojis in this server.';
        } else if (error.code === 30008) {
            errorMessage = '❌ Maximum number of emojis reached for this server.';
        }

        await interaction.editReply({ content: errorMessage });
    }
}

async function handleUpload(interaction) {
    await interaction.deferReply();

    const attachment = interaction.options.getAttachment('attachment');
    const emojiName = interaction.options.getString('name');

    try {
        // Validate file size (Discord limit is 256KB for emojis)
        if (attachment.size > 256000) {
            return await interaction.editReply({
                content: '❌ File size too large. Emoji files must be under 256KB.'
            });
        }

        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
        if (!validTypes.includes(attachment.contentType)) {
            return await interaction.editReply({
                content: '❌ Invalid file type. Please upload a PNG, JPEG, GIF, or WebP image.'
            });
        }

        // Validate emoji name
        if (!emojiName || emojiName.length < 2 || emojiName.length > 32) {
            return await interaction.editReply({
                content: '❌ Emoji name must be between 2 and 32 characters long.'
            });
        }

        // Check if emoji with this name already exists
        const existingEmoji = interaction.guild.emojis.cache.find(emoji => emoji.name === emojiName);
        if (existingEmoji) {
            return await interaction.editReply({
                content: `❌ An emoji with the name "${emojiName}" already exists.`
            });
        }

        // Create the emoji
        const newEmoji = await interaction.guild.emojis.create({
            attachment: attachment.url,
            name: emojiName,
            reason: `Emoji uploaded by ${interaction.user.tag} (${interaction.user.id})`
        });

        const successEmbed = new EmbedBuilder()
            .setTitle('✅ Emoji Uploaded Successfully')
            .setColor(getEmbedColor(interaction.client))
            .addFields(
                { name: 'Emoji', value: `${newEmoji}`, inline: true },
                { name: 'Name', value: newEmoji.name, inline: true },
                { name: 'ID', value: newEmoji.id, inline: true },
                { name: 'Added by', value: interaction.user.tag, inline: true }
            )
            .setThumbnail(newEmoji.url)
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
        console.error('Error uploading emoji:', error);
        let errorMessage = '❌ Failed to upload the emoji.';

        if (error.code === 50035) {
            errorMessage = '❌ Invalid image format. Please use a valid image file.';
        } else if (error.code === 50013) {
            errorMessage = '❌ I don\'t have permission to manage emojis in this server.';
        } else if (error.code === 30008) {
            errorMessage = '❌ Maximum number of emojis reached for this server.';
        }

        await interaction.editReply({ content: errorMessage });
    }
}

async function handleDelete(interaction) {
    await interaction.deferReply();

    const emojiInput = interaction.options.getString('emoji');

    try {
        let targetEmoji = null;

        // Check if it's a custom Discord emoji format
        const customEmojiRegex = /<a?:([^:]+):(\d+)>/;
        const customEmojiMatch = emojiInput.match(customEmojiRegex);

        if (customEmojiMatch) {
            // Extract emoji ID from custom emoji format
            const emojiId = customEmojiMatch[2];
            targetEmoji = interaction.guild.emojis.cache.get(emojiId);
        } else {
            // Search by name or ID
            targetEmoji = interaction.guild.emojis.cache.find(emoji => 
                emoji.name === emojiInput || emoji.id === emojiInput
            );
        }

        if (!targetEmoji) {
            return await interaction.editReply({
                content: '❌ Emoji not found in this server. Please make sure the emoji exists and try again.'
            });
        }

        // Store emoji info before deletion
        const emojiInfo = {
            name: targetEmoji.name,
            id: targetEmoji.id,
            url: targetEmoji.url,
            animated: targetEmoji.animated
        };

        // Delete the emoji
        await targetEmoji.delete(`Emoji deleted by ${interaction.user.tag} (${interaction.user.id})`);

        const successEmbed = new EmbedBuilder()
            .setTitle('✅ Emoji Deleted Successfully')
            .setColor(getEmbedColor(interaction.client))
            .addFields(
                { name: 'Name', value: emojiInfo.name, inline: true },
                { name: 'ID', value: emojiInfo.id, inline: true },
                { name: 'Type', value: emojiInfo.animated ? 'Animated' : 'Static', inline: true },
                { name: 'Deleted by', value: interaction.user.tag, inline: true }
            )
            .setThumbnail(emojiInfo.url)
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
        console.error('Error deleting emoji:', error);
        let errorMessage = '❌ Failed to delete the emoji.';

        if (error.code === 50013) {
            errorMessage = '❌ I don\'t have permission to manage emojis in this server.';
        } else if (error.code === 10014) {
            errorMessage = '❌ Emoji not found. It may have already been deleted.';
        }

        await interaction.editReply({ content: errorMessage });
    }
}

async function handleInfo(interaction) {
    await interaction.deferReply();

    const emojiInput = interaction.options.getString('emoji');

    try {
        let targetEmoji = null;

        // Check if it's a custom Discord emoji format
        const customEmojiRegex = /<a?:([^:]+):(\d+)>/;
        const customEmojiMatch = emojiInput.match(customEmojiRegex);

        if (customEmojiMatch) {
            // Extract emoji ID from custom emoji format
            const emojiId = customEmojiMatch[2];
            targetEmoji = interaction.guild.emojis.cache.get(emojiId);
        } else {
            // Search by name or ID
            targetEmoji = interaction.guild.emojis.cache.find(emoji => 
                emoji.name === emojiInput || emoji.id === emojiInput
            );
        }

        if (!targetEmoji) {
            return await interaction.editReply({
                content: '❌ Emoji not found in this server. Please make sure the emoji exists and try again.'
            });
        }

        const infoEmbed = new EmbedBuilder()
            .setTitle('📝 Emoji Information')
            .setColor(getEmbedColor(interaction.client))
            .addFields(
                { name: 'Name', value: targetEmoji.name, inline: true },
                { name: 'ID', value: targetEmoji.id, inline: true },
                { name: 'Type', value: targetEmoji.animated ? 'Animated' : 'Static', inline: true },
                { name: 'Created', value: `<t:${Math.floor(targetEmoji.createdAt.getTime() / 1000)}:R>`, inline: true },
                { name: 'Managed', value: targetEmoji.managed ? 'Yes' : 'No', inline: true },
                { name: 'Available', value: targetEmoji.available ? 'Yes' : 'No', inline: true },
                { name: 'Usage', value: `\`${targetEmoji}\``, inline: false }
            )
            .setThumbnail(targetEmoji.imageURL({ size: 512 }))
            .setTimestamp()
            .setFooter({ text: `Guild: ${interaction.guild.name}` });

        await interaction.editReply({ embeds: [infoEmbed] });

    } catch (error) {
        console.error('Error getting emoji info:', error);
        await interaction.editReply({
            content: '❌ Failed to get emoji information.'
        });
    }
}

async function handleImage(interaction) {
    await interaction.deferReply();

    const emojiInput = interaction.options.getString('emoji');

    try {
        let targetEmoji = null;

        // Check if it's a custom Discord emoji format
        const customEmojiRegex = /<a?:([^:]+):(\d+)>/;
        const customEmojiMatch = emojiInput.match(customEmojiRegex);

        if (customEmojiMatch) {
            // Extract emoji ID from custom emoji format
            const emojiId = customEmojiMatch[2];
            targetEmoji = interaction.guild.emojis.cache.get(emojiId);
        } else {
            // Search by name or ID
            targetEmoji = interaction.guild.emojis.cache.find(emoji => 
                emoji.name === emojiInput || emoji.id === emojiInput
            );
        }

        if (!targetEmoji) {
            return await interaction.editReply({
                content: '❌ Emoji not found in this server. Please make sure the emoji exists and try again.'
            });
        }

        // Get 4096 resolution image URL
        const emoji4096 = targetEmoji.imageURL({ size: 4096 });

        const imageEmbed = new EmbedBuilder()
            .setTitle(`${targetEmoji.name} - 4096x4096`)
            .setColor(getEmbedColor(interaction.client))
            .setImage(emoji4096)
            .setTimestamp()
            .setFooter({ text: `Emoji ID: ${targetEmoji.id}` });

        await interaction.editReply({ embeds: [imageEmbed] });

    } catch (error) {
        console.error('Error getting emoji image:', error);
        await interaction.editReply({
            content: '❌ Failed to get emoji image.'
        });
    }
                  }
