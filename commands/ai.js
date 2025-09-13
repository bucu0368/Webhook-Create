
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Helper function to get colors from config
function getEmbedColor(client) {
    return client.config?.EmbedColor || '#0099ff';
}

function getErrorColor(client) {
    return client.config?.ErrorColor || '#ff0000';
}

const GROQ_API_KEY = 'get apikey here https://console.groq.com/keys';
const IMAGE_API_KEY = 'join https://discord.gg/Zg2XkS5hq9 for get apikey';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('AI-powered commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('imagine')
                .setDescription('Generate an image from a text prompt')
                .addStringOption(option =>
                    option
                        .setName('prompt')
                        .setDescription('The prompt to generate an image from')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('chatbot')
                .setDescription('Chat with AI')
                .addStringOption(option =>
                    option
                        .setName('prompt')
                        .setDescription('Your message to the AI')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'imagine':
                    await handleImagine(interaction);
                    break;
                case 'chatbot':
                    await handleChatbot(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown subcommand.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in AI command:', error);
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

async function handleImagine(interaction) {
    const prompt = interaction.options.getString('prompt');
    
    // Create loading embed
    const loadingEmbed = new EmbedBuilder()
        .setTitle('🎨 Generating Image...')
        .setDescription('Please wait while I create your image.')
        .setColor(getEmbedColor(interaction.client))
        .setTimestamp();

    await interaction.reply({ embeds: [loadingEmbed] });

    try {
        const encodedPrompt = encodeURIComponent(prompt);
        const response = await fetch(`http://67.220.85.146:6207/image?prompt=${encodedPrompt}`, {
            method: 'GET',
            headers: {
                'x-api-key': IMAGE_API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        const embed = new EmbedBuilder()
            .setTitle('🎨 Image Generated')
            .setDescription(`**Prompt:**\n\`\`\`${data.prompt || prompt}\`\`\``)
            .setColor(getEmbedColor(interaction.client))
            .addFields([
                {
                    name: 'Information',
                    value: `**imageId:** ${data.imageId || 'N/A'}\n**status:** ${data.status || 'completed'}\n**duration:** ${data.duration || 'N/A'}`,
                    inline: false
                }
            ])
            .setImage(data.image || null)
            .setFooter({ 
                text: `Requested by: ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

        // Create action row with buttons
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Invite Bot')
                    .setURL(`https://discord.com/oauth2/authorize?client_id=${interaction.client.config.clientId}&permissions=8&integration_type=0&scope=bot`)
                    .setStyle(ButtonStyle.Link),
                new ButtonBuilder()
                    .setLabel('Support Server')
                    .setURL(interaction.client.config.SupportServerLink)
                    .setStyle(ButtonStyle.Link)
            );

        await interaction.editReply({ 
            embeds: [embed],
            components: [row]
        });

    } catch (error) {
        console.error('Error generating image:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Image Generation Failed')
            .setDescription('Sorry, I couldn\'t generate the image. Please try again later.')
            .setColor(getErrorColor(interaction.client))
            .setTimestamp();

        await interaction.editReply({ 
            embeds: [errorEmbed],
            components: []
        });
    }
}

async function handleChatbot(interaction) {
    const prompt = interaction.options.getString('prompt');
    
    await interaction.deferReply();

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                max_tokens: 1000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.choices[0]?.message?.content || 'No response generated.';

        const embed = new EmbedBuilder()
            .setTitle('🤖 AI Chatbot')
            .setColor(getEmbedColor(interaction.client))
            .addFields([
                {
                    name: '❓ Your Question',
                    value: prompt.length > 1024 ? prompt.substring(0, 1021) + '...' : prompt,
                    inline: false
                },
                {
                    name: '🤖 AI Response',
                    value: aiResponse.length > 1024 ? aiResponse.substring(0, 1021) + '...' : aiResponse,
                    inline: false
                }
            ])
            .setFooter({ 
                text: `Requested by: ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error with chatbot:', error);
        
        let errorMessage = 'Sorry, I couldn\'t process your request. Please try again later.';
        
        if (error.message.includes('401')) {
            errorMessage = 'API key is invalid or missing. Please check the GROQ_API_KEY environment variable.';
        } else if (error.message.includes('429')) {
            errorMessage = 'Rate limit exceeded. Please try again later.';
        }
        
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Chatbot Error')
            .setDescription(errorMessage)
            .setColor(getErrorColor(interaction.client))
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}
