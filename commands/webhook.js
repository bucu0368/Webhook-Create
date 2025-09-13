const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Helper function to get colors from config
function getEmbedColor(client) {
    return client.config?.EmbedColor;
}

function getErrorColor(client) {
    return client.config?.ErrorColor;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('webhook')
        .setDescription('Manage webhooks in this server')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageWebhooks)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new webhook')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to create webhook in (defaults to current channel)')
                        .setRequired(false))
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Name for the webhook (optional)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a webhook')
                .addStringOption(option =>
                    option
                        .setName('webhook_url')
                        .setDescription('The webhook URL to delete')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all webhooks in this server'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('say')
                .setDescription('Send a message through a webhook')
                .addStringOption(option =>
                    option
                        .setName('webhook_url')
                        .setDescription('The webhook URL to use')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('message')
                        .setDescription('The message to send')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('username')
                        .setDescription('Custom username for the webhook')
                        .setRequired(false))
                .addStringOption(option =>
                    option
                        .setName('avatar_url')
                        .setDescription('Custom avatar URL for the webhook')
                        .setRequired(false))),

    async execute(interaction) {

        // Check if user has manage webhooks permission
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageWebhooks)) {
            return await interaction.reply({
                content: '❌ You need the "Manage Webhooks" permission to use this command.',
                ephemeral: true
            });
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
                case 'list':
                    await handleList(interaction);
                    break;
                case 'say':
                    await handleSay(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown subcommand.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in webhook command:', error);
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
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const name = interaction.options.getString('name') || `Webhook-${Date.now()}`;

    try {
        const webhook = await channel.createWebhook({
            name: name,
            reason: `Webhook created by ${interaction.user.tag} via bot command`
        });

        const embed = new EmbedBuilder()
            .setTitle('✅ Webhook Created Successfully')
            .setColor(getEmbedColor(interaction.client))
            .addFields(
                { name: 'Name', value: webhook.name, inline: true },
                { name: 'Channel', value: `<#${channel.id}>`, inline: true },
                { name: 'ID', value: webhook.id, inline: true },
                { name: 'URL', value: `||${webhook.url}||`, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `Created by ${interaction.user.tag}` });

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error creating webhook:', error);
        await interaction.editReply({
            content: '❌ Failed to create webhook. Make sure I have permission to manage webhooks in that channel.'
        });
    }
}

async function handleDelete(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const webhookUrl = interaction.options.getString('webhook_url');

    try {
        // Extract webhook ID and token from URL
        const webhookRegex = /https:\/\/discord\.com\/api\/webhooks\/(\d+)\/([A-Za-z0-9_-]+)/;
        const match = webhookUrl.match(webhookRegex);

        if (!match) {
            return await interaction.editReply({
                content: '❌ Invalid webhook URL format.'
            });
        }

        const [, webhookId, webhookToken] = match;

        // Delete the webhook
        const response = await fetch(`https://discord.com/api/v10/webhooks/${webhookId}/${webhookToken}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            const embed = new EmbedBuilder()
                .setTitle('✅ Webhook Deleted Successfully')
                .setColor(getEmbedColor(interaction.client))
                .addFields(
                    { name: 'Webhook ID', value: webhookId, inline: true },
                    { name: 'Deleted by', value: interaction.user.tag, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.editReply({
                content: '❌ Failed to delete webhook. The webhook may not exist or the URL is invalid.'
            });
        }
    } catch (error) {
        console.error('Error deleting webhook:', error);
        await interaction.editReply({
            content: '❌ An error occurred while deleting the webhook.'
        });
    }
}

async function handleList(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const webhooks = await interaction.guild.fetchWebhooks();
        const webhookArray = Array.from(webhooks.values());

        if (webhookArray.length === 0) {
            return await interaction.editReply({
                content: '📭 No webhooks found in this server.'
            });
        }

        const itemsPerPage = 5;
        let currentPage = 0;
        const totalPages = Math.ceil(webhookArray.length / itemsPerPage);

        function createEmbed(page) {
            const start = page * itemsPerPage;
            const end = start + itemsPerPage;
            const currentWebhooks = webhookArray.slice(start, end);

            const embed = new EmbedBuilder()
                .setTitle(`🔗 Server Webhooks (Page ${page + 1}/${totalPages})`)
                .setColor(getEmbedColor(interaction.client))
                .setTimestamp()
                .setFooter({ text: `Total: ${webhookArray.length} webhooks` });

            currentWebhooks.forEach((webhook, index) => {
                const globalIndex = start + index + 1;
                embed.addFields({
                    name: `${globalIndex}. ${webhook.name}`,
                    value: `**Channel:** <#${webhook.channelId}>\n**ID:** \`${webhook.id}\`\n**Created:** <t:${Math.floor(webhook.createdAt.getTime() / 1000)}:R>`,
                    inline: false
                });
            });

            return embed;
        }

        function createButtons(page) {
            const row = new ActionRowBuilder();
            
            const prevButton = new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 0);

            const nextButton = new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === totalPages - 1);

            row.addComponents(prevButton, nextButton);
            return row;
        }

        const embed = createEmbed(currentPage);
        const components = totalPages > 1 ? [createButtons(currentPage)] : [];

        const response = await interaction.editReply({
            embeds: [embed],
            components: components
        });

        if (totalPages > 1) {
            const collector = response.createMessageComponentCollector({
                time: 60000
            });

            collector.on('collect', async (buttonInteraction) => {
                if (buttonInteraction.user.id !== interaction.user.id) {
                    return await buttonInteraction.reply({
                        content: '❌ You cannot use these buttons.',
                        ephemeral: true
                    });
                }

                if (buttonInteraction.customId === 'prev') {
                    currentPage--;
                } else if (buttonInteraction.customId === 'next') {
                    currentPage++;
                }

                const newEmbed = createEmbed(currentPage);
                const newComponents = [createButtons(currentPage)];

                await buttonInteraction.update({
                    embeds: [newEmbed],
                    components: newComponents
                });
            });

            collector.on('end', async () => {
                try {
                    await interaction.editReply({ components: [] });
                } catch (error) {
                    // Ignore error if message was already deleted
                }
            });
        }
    } catch (error) {
        console.error('Error listing webhooks:', error);
        await interaction.editReply({
            content: '❌ Failed to fetch webhooks. Make sure I have permission to manage webhooks.'
        });
    }
}

async function handleSay(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const webhookUrl = interaction.options.getString('webhook_url');
    const message = interaction.options.getString('message');
    const username = interaction.options.getString('username');
    const avatarUrl = interaction.options.getString('avatar_url');

    try {
        // Validate webhook URL format
        const webhookRegex = /https:\/\/discord\.com\/api\/webhooks\/(\d+)\/([A-Za-z0-9_-]+)/;
        if (!webhookRegex.test(webhookUrl)) {
            return await interaction.editReply({
                content: '❌ Invalid webhook URL format.'
            });
        }

        const payload = {
            content: message
        };

        if (username) {
            payload.username = username;
        }

        if (avatarUrl) {
            payload.avatar_url = avatarUrl;
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const embed = new EmbedBuilder()
                .setTitle('✅ Message Sent Successfully')
                .setColor(getEmbedColor(interaction.client))
                .addFields(
                    { name: 'Message', value: message.substring(0, 1024), inline: false },
                    { name: 'Sent by', value: interaction.user.tag, inline: true }
                )
                .setTimestamp();

            if (username) {
                embed.addFields({ name: 'Username', value: username, inline: true });
            }

            await interaction.editReply({ embeds: [embed] });
        } else {
            const errorText = await response.text();
            console.error('Webhook error:', response.status, errorText);
            await interaction.editReply({
                content: '❌ Failed to send message through webhook. The webhook may be invalid or deleted.'
            });
        }
    } catch (error) {
        console.error('Error sending webhook message:', error);
        await interaction.editReply({
            content: '❌ An error occurred while sending the message.'
        });
    }
          }
