/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
App/Filename : particlecord/app.js
Description  : Initializes nodejs
Author       : RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

//Packages and configuration - - - - - - - - - - - - -
//Declare packages
const express = require("express");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require('uuid');
const eris = require('eris');
const chalk = require('chalk');
const pkg = require('./package.json');
const ora = require('ora');
const spinner = ora('');

//Initialize exit options for testing environments
let exitOpt = require('./exit_options.js');
setTimeout(exitOpt.testCheck, 3000);

//Print header to console
console.log(chalk.blue.bold('\nParticlecord v' + pkg.version + ' | ' + pkg.author));
console.log(chalk.white('--> Description: ' + pkg.description));
console.log(chalk.white('--> Github: ' + pkg.homepage + '\n'));

//Setup config.json database
spinner.start('Checking configuration');
let dataStore = require('data-store');
let storage = new dataStore({path: './config.json'});
let invalid_config = false;

//Config value: discord_bot_token
let discord_bot_token = storage.get('discord_bot_token');
if (discord_bot_token === undefined || discord_bot_token === '') {
    storage.set('discord_bot_token', '');
    spinner.fail('Please configure the "discord_bot_token" value in config.json');
    invalid_config = true;
}

//Config value: webhook_secret
let webhook_secret = storage.get('webhook_secret');
if (webhook_secret === undefined || webhook_secret === '') {
    let new_secret = uuidv4();
    storage.set('webhook_secret', new_secret);
    spinner.warn('"webhook_secret" value in config.json set default: ' + new_secret);
}

//Config value: api_port
let api_port = storage.get('api_port');
if (api_port === undefined || api_port === '') {
    storage.set('api_port', 3000);
    spinner.warn('"api_port" value in config.json set to default: 3000');
}

//Exit if the config values are not set properly
if (invalid_config) {
    process.exit(1);
} else {
    spinner.succeed('Config values have been propagated');
}
//End of Packages and configuration - - - - - - - - - -

//API Webhooks - - - - - - - - - - - - - - - - - - - -
//Setup express
const app = express();
app.use(bodyParser.json());

//Define routes
app.post("/particle", (req, res) => {
    console.log(req.body);
    res.status(200).end();
})

//Start express on defined port
app.listen(storage.get('api_port'), () => spinner.succeed('API webserver running on port ' + storage.get('api_port')))

//End of API Webhooks - - - - - - - - - - - - - - - - -

//Discord integration - - - - - - - - - - - - - - - - -
//Create a new client instance with eris
const bot = new eris.Client(storage.get('discord_bot_token'));

//When the bot is connected and ready, update console
bot.on('ready', () => {
    spinner.succeed('Connected to Discord API');
});

//Every time a message is sent mentioning the bot
bot.on('messageCreate', async (msg) => {
    const botWasMentioned = msg.mentions.find(
        mentionedUser => mentionedUser.id === bot.user.id,
    );
    if (botWasMentioned) {

    }
    if (msg.content === 'ping') {
        try {
            await msg.channel.createMessage('pong');
        } catch (err) {
            console.warn('Failed to respond to comment');
            console.warn(err);
        }
    }
});

//Handle any errors that the bot encounters
bot.on('error', err => {
    console.warn(err);
});

//Start Discord bot
spinner.start('Attempting to connect to Discord API');
bot.connect();
//End of Discord integration - - - - - - - - - - - - -
