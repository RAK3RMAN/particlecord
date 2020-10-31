/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
App/Filename : particlecord/app.js
Description  : Initializes nodejs
Author       : RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

//Packages and configuration - - - - - - - - - - - - -
//Declare packages
const express = require("express");
const bodyParser = require("body-parser");
const dataStore = require('data-store');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
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

//Setup config.json and devices.json database
spinner.start('Checking configuration');
let config_storage = new dataStore({path: './config.json'});
let devices_storage = new dataStore({path: './devices.json'});
let invalid_config = false;

//Config value: discord_bot_token
if (!config_storage.has('discord_bot_token') || config_storage.get('discord_bot_token') === '') {
    config_storage.set('discord_bot_token', '');
    spinner.fail('Please configure the "discord_bot_token" value in config.json');
    invalid_config = true;
}

//Config value: discord_bot_channel
if (!config_storage.has('discord_bot_channel') || config_storage.get('discord_bot_channel') === '') {
    config_storage.set('discord_bot_channel', '');
    spinner.fail('Please configure the "discord_bot_channel" value in config.json');
    invalid_config = true;
}

//Config value: webhook_secret
if (!config_storage.has('webhook_secret') || config_storage.get('webhook_secret') === '') {
    let new_secret = uuidv4();
    config_storage.set('webhook_secret', new_secret);
    spinner.warn('"webhook_secret" value in config.json set default: ' + new_secret);
}

//Config value: api_port
if (!config_storage.has('api_port') || config_storage.get('api_port') === '') {
    config_storage.set('api_port', 3000);
    spinner.warn('"api_port" value in config.json set to default: 3000');
}

//Exit if the config values are not set properly
if (invalid_config) {
    process.exit(1);
} else {
    spinner.succeed('Config values have been propagated');
}
//End of Packages and configuration - - - - - - - - - -

//Discord integration - - - - - - - - - - - - - - - - -
//Create a new client instance with eris
const bot = new eris.Client(config_storage.get('discord_bot_token'));

//When the bot is connected and ready, update console
bot.on('ready', () => {
    spinner.succeed('Connected to Discord API');
    spinner.succeed(`${chalk.blue('Particlecord')} ready and listening`);
});

//Every time a message is created in the Discord server
bot.on('messageCreate', async (msg) => {
    if (msg.content === '!ping') {
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
//End of Discord integration - - - - - - - - - - - - -

//API Webhooks - - - - - - - - - - - - - - - - - - - -
//Setup express
const app = express();
app.use(bodyParser.json());

//Handle post requests for Particle Tracker One events
app.post("/api/particle/trackerone", (req, res) => {
    spinner.info(`${chalk.yellow('API /api/particle/trackerone')}: Received POST request, parsing data`);
    //Make sure we are authenticated
    if (req.body.api_key === config_storage.get('webhook_secret')) {
        //Get device data
        let device = devices_storage.get(req.body.coreid);
        if (device === undefined) {
            device = {};
            spinner.info(`${chalk.yellow('API /api/particle/trackerone')}: (id:` + req.body.coreid + `) Creating new device in devices.json`);
        }
        device.data = JSON.parse(req.body.data);

        //Make sure device_name, alert_freq_min, last_alert_update exists for device
        if (device.alert_freq_min === undefined) {
            device.alert_freq_min = 60;
            spinner.info(`${chalk.yellow('API /api/particle/trackerone')}: (id:` + req.body.coreid + `) "alert_freq_min" set to default: ` + device.alert_freq_min);
        }
        if (device.device_name === undefined) {
            device.device_name = req.body.coreid;
            spinner.info(`${chalk.yellow('API /api/particle/trackerone')}: (id:` + req.body.coreid + `) "device_name" set to default: ` + device.device_name);
        }
        if (device.last_alert_update === undefined) {
            device.last_alert_update = moment();
            spinner.info(`${chalk.yellow('API /api/particle/trackerone')}: (id:` + req.body.coreid + `) "last_alert_update" set to default: ` + device.last_alert_update);
        }

        //Check to see if we need to send update
        let check_reason = "false";
        //Loop through trigger reasons
        for (let sent_reason of device.data.trig) {
            if (sent_reason === "radius") {
                check_reason = " has changed in GPS location at ";
            } else if (sent_reason === "imu_m" || sent_reason === "img_g") {
                check_reason = " has been moved physically at ";
            }
        }
        //If the trigger reason is valid, check to see if we can send an alert
        if (check_reason !== "false") {
            //Send an alert if the freq has passed
            if (moment().isAfter(moment(device.last_alert_update).add(device.alert_freq_min, 'm'))) {
                device.last_alert_update = moment();
                spinner.info(`${chalk.yellow('API /api/particle/trackerone')}: (id:` + req.body.coreid + `) Event trigger reason is valid and is past the alert frequency, sending alert`);
                let message = device.device_name + check_reason + moment().format('MM/DD/YY h:mm:ss a') + " http://maps.apple.com/maps?q=" + device.data.loc.lat + "," + device.data.loc.lon + "";
                bot.createMessage(config_storage.get('discord_bot_channel'), message);
                spinner.info(`${chalk.cyan('DISCORD')}: ${chalk.yellow('API /api/particle/trackerone')} triggered message send to channel "` + message + `"`);
            } else {
                spinner.info(`${chalk.yellow('API /api/particle/trackerone')}: (id:` + req.body.coreid + `) Event trigger reason is valid but not past the alert frequency, skipping alert`);
            }
        } else {
            spinner.info(`${chalk.yellow('API /api/particle/trackerone')}: (id:` + req.body.coreid + `) Event does not match a valid trigger reason, skipping alert`);
        }

        //Update device data
        devices_storage.set(req.body.coreid, {
            device_name: device.device_name,
            data: device.data,
            last_data_update: moment(req.body.published_at),
            last_alert_update: device.last_alert_update,
            alert_freq_min: device.alert_freq_min
        });
        spinner.info(`${chalk.yellow('API /api/particle/trackerone')}: (id:` + req.body.coreid + `) Updated data for device`);
        res.status(200).end();
    } else {
        spinner.warn(`${chalk.yellow('API')}: Unauthorized POST request`);
        res.status(403).end();
    }
})

//Start express on defined port
spinner.start('Attempting to start API webserver');
app.listen(config_storage.get('api_port'), function () {
    //Successfully started webserver
    spinner.succeed('API webserver running on port ' + config_storage.get('api_port'));
    //Start Discord bot
    spinner.start('Attempting to connect to Discord API');
    bot.connect();
})
//End of API Webhooks - - - - - - - - - - - - - - - - -
