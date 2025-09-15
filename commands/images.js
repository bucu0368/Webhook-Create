const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Helper function to get colors from config
function getEmbedColor(client) {
    return client.config?.EmbedColor || '#0099ff';
}

function getErrorColor(client) {
    return client.config?.ErrorColor || '#ff0000';
}

// Animal API endpoints
const ANIMAL_APIS = {
    dog: 'https://dog.ceo/api/breeds/image/random',
    cat: 'https://api.thecatapi.com/v1/images/search',
    fox: 'https://randomfox.ca/floof/',
    bird: 'https://api.alexflipnote.dev/birb',
    koala: 'https://some-random-api.com/img/koala',
    panda: 'https://some-random-api.com/img/panda',
    red_panda: 'https://some-random-api.com/img/red_panda'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('images')
        .setDescription('Get random images')
        .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands)
        .addSubcommandGroup(group =>
            group
                .setName('animal')
                .setDescription('Get random animal images')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('dog')
                        .setDescription('Get a random dog image'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('cat')
                        .setDescription('Get a random cat image'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('fox')
                        .setDescription('Get a random fox image'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('bird')
                        .setDescription('Get a random bird image'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('koala')
                        .setDescription('Get a random koala image'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('panda')
                        .setDescription('Get a random panda image'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('red_panda')
                        .setDescription('Get a random red panda image'))),

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

        const group = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        if (group === 'animal') {
            await handleAnimalImage(interaction, subcommand);
        }
    },
};

async function handleAnimalImage(interaction, animal) {
    await interaction.deferReply();

    try {
        let imageUrl = null;
        let animalName = animal.replace('_', ' ');

        switch (animal) {
            case 'dog':
                const dogResponse = await fetch(ANIMAL_APIS.dog);
                const dogData = await dogResponse.json();
                imageUrl = dogData.message;
                break;

            case 'cat':
                const catResponse = await fetch(ANIMAL_APIS.cat);
                const catData = await catResponse.json();
                imageUrl = catData[0].url;
                break;

            case 'fox':
                const foxResponse = await fetch(ANIMAL_APIS.fox);
                const foxData = await foxResponse.json();
                imageUrl = foxData.image;
                break;

            case 'bird':
                const birdResponse = await fetch(ANIMAL_APIS.bird);
                const birdData = await birdResponse.json();
                imageUrl = birdData.file;
                break;

            case 'koala':
                const koalaResponse = await fetch(ANIMAL_APIS.koala);
                const koalaData = await koalaResponse.json();
                imageUrl = koalaData.link;
                break;

            case 'panda':
                const pandaResponse = await fetch(ANIMAL_APIS.panda);
                const pandaData = await pandaResponse.json();
                imageUrl = pandaData.link;
                break;

            case 'red_panda':
                const redPandaResponse = await fetch(ANIMAL_APIS.red_panda);
                const redPandaData = await redPandaResponse.json();
                imageUrl = redPandaData.link;
                break;

            default:
                throw new Error('Unknown animal type');
        }

        if (!imageUrl) {
            throw new Error('No image URL received');
        }

        const embed = new EmbedBuilder()
            .setTitle(`🐾 Random ${animalName.charAt(0).toUpperCase() + animalName.slice(1)} Image`)
            .setColor(getEmbedColor(interaction.client))
            .setImage(imageUrl)
            .setFooter({ 
                text: `Requested by: ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error(`Error fetching ${animal} image:`, error);

        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Image Fetch Failed')
            .setDescription(`Sorry, I couldn't fetch a ${animal} image. Please try again later.`)
            .setColor(getErrorColor(interaction.client))
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}
