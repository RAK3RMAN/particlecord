/*\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
App/Filename : particlecord/app.js
Description  : Initializes nodejs
Author       : RAk3rman
\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\*/

//Packages and configuration - - - - - - - - - - - - - - - - - - - - - - - - -
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

//Config value: discord_bot_prefix
if (!config_storage.has('discord_bot_prefix') || config_storage.get('discord_bot_prefix') === '') {
    config_storage.set('discord_bot_prefix', '!');
    spinner.warn('"discord_bot_prefix" value in config.json set to default: !');
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

//Create variables for pass-through between API and Discord bot
let last_alert_device_id = '';

//Exit if the config values are not set properly
if (invalid_config) {
    process.exit(1);
} else {
    spinner.succeed('Config values have been propagated');
}
//End of Packages and configuration - - - - - - - - - - - - - - - - - - - - - -

//Discord integration - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//Create a new client instance with eris
const bot = new eris.Client(config_storage.get('discord_bot_token'));

//When the bot is connected and ready, update console
bot.on('ready', () => {
    //Set bot status
    bot.editStatus("online", {name: config_storage.get('discord_bot_prefix') + "help", type: 2})
    //Send update to console
    spinner.succeed('Connected to Discord API');
    spinner.succeed(`${chalk.blue.bold('Particlecord')} listening for ${chalk.yellow('API')} and ${chalk.cyan('Discord')} events`);
});

//Every time a message is created in the Discord server
bot.on('messageCreate', async (msg) => {
    //Get Discord prefix
    let pre = config_storage.get('discord_bot_prefix');
    //Split message into components
    let parts = msg.content.split(' ');
    //Determine if we received a command
    if (parts[0] === pre + 'help') { // If we receive the help command, display all Particlecord commands
        spinner.start(`${chalk.cyan('Discord')}: Sending message to "` + pre + `help" command`);
        //Send message to Discord channel, catch error if thrown
        try {
            await msg.channel.createMessage('**Particlecord commands**\n' +
                '> ' + pre + 'help: Displays all Particlecord commands\n' +
                '> ' + pre + 'status: Returns more details from the last alert\n' +
                '> ' + pre + 'devices: Returns all known devices\n' +
                '> ' + pre + 'details <device_id>: Returns all details for a Particle device_id\n' +
                '> ' + pre + 'alert_freq <device_id> <freq_in_min>: Sets the alert frequency in terms of minutes for a device, use 0 for verbose alerts\n' +
                '> ' + pre + 'name <device_id> <friendly_name>: Changes the friendly name for a Particle device_id\n');
            spinner.succeed(`${chalk.cyan('Discord')}: Sent message to "` + pre + `help" command`);
        } catch (err) {
            spinner.fail(`${chalk.cyan('Discord')}: Failed to send message`);
        }
    } else if (parts[0]=== pre + 'status') { // If we receive the status command, return more details from the last alert
        spinner.start(`${chalk.cyan('Discord')}: Sending message to "` + pre + `status" command`);
        //Send message to Discord channel, catch error if thrown
        try {
            if (last_alert_device_id === '') {
                await msg.channel.createMessage('Please wait for an alert to occur');
            } else {
                await msg.channel.createMessage(get_status(last_alert_device_id));
            }
            spinner.succeed(`${chalk.cyan('Discord')}: Sent message to "` + pre + `status" command`);
        } catch (err) {
            spinner.fail(`${chalk.cyan('Discord')}: Failed to send message`);
            console.log(err);
        }
    } else if (parts[0]=== pre + 'devices') { // If we receive the devices command, return all known devices
        spinner.start(`${chalk.cyan('Discord')}: Sending message to "` + pre + `devices" command`);
        let devices_payload = "";
        let all_devices = JSON.parse(devices_storage.json(null, 2));
        for (let i in all_devices){
            if (all_devices.hasOwnProperty(i)) {
                devices_payload += '> ' + i + ' | ' + all_devices[i].device_name + ' | ' + moment(all_devices[i].last_data_update).format('h:mm:ss a [on] MM/DD/YY Z [UTC]') + '\n';
            }
        }
        //Send message to Discord channel, catch error if thrown
        try {
            await msg.channel.createMessage('**Devices** (device_id | friendly_name | last_data_update)\n' + devices_payload);
            spinner.succeed(`${chalk.cyan('Discord')}: Sent message to "` + pre + `devices" command`);
        } catch (err) {
            spinner.fail(`${chalk.cyan('Discord')}: Failed to send message`);
            console.log(err);
        }
    } else if (parts[0] === pre + 'details') { // If we receive the details command, return all details for a Particle device_id
        spinner.start(`${chalk.cyan('Discord')}: Sending message to "` + pre + `details" command`);
        //Send message to Discord channel, catch error if thrown
        try {
            await msg.channel.createMessage(get_status(parts[1]));
            spinner.succeed(`${chalk.cyan('Discord')}: Sent message to "` + pre + `details" command`);
        } catch (err) {
            spinner.fail(`${chalk.cyan('Discord')}: Failed to send message`);
            console.log(err);
        }
    } else if (parts[0] === pre + 'alert_freq') { // If we receive the alert_freq command, set the alert frequency in terms of minutes for a device
        //Make sure device_id exists
        if (devices_storage.has(parts[1]) && parts[1] !== undefined) {
            let device = devices_storage.get(parts[1]);
            //Check to make sure the freq_in_min value is valid
            if (parts[2] >= 0) {
                //Update device data
                devices_storage.set(parts[1], {
                    device_name: device.device_name,
                    data: device.data,
                    last_data_update: device.last_data_update,
                    last_alert_update: device.last_alert_update,
                    alert_freq_min: parts[2]
                });
                spinner.info(`${chalk.cyan('Discord')}: (id:` + parts[1] + `) Updated alert_freq to ` + parts[2] + ` for device due to "` + pre + `alert_freq" command`);
                //Send message to Discord channel, catch error if thrown
                try {
                    await msg.channel.createMessage(device.device_name + ' (' + parts[1] + ') will now send alerts at a maximum of every ' + parts[2] + ' mins');
                } catch (err) {
                    spinner.fail(`${chalk.cyan('Discord')}: Failed to send message`);
                    console.log(err);
                }
            } else {
                spinner.fail(`${chalk.cyan('Discord')}: <freq_in_min> must be greater than or equal to 0, responding with error`);
                //Send message to Discord channel, catch error if thrown
                try {
                    await msg.channel.createMessage('ERROR: <freq_in_min> must be greater than or equal to 0, check ' + pre + 'help');
                } catch (err) {
                    spinner.fail(`${chalk.cyan('Discord')}: Failed to send message`);
                    console.log(err);
                }
            }
        } else {
            spinner.fail(`${chalk.cyan('Discord')}: <device_id> does not exist, responding with error`);
            //Send message to Discord channel, catch error if thrown
            try {
                await msg.channel.createMessage('ERROR: Particle <device_id> does not exist in database');
            } catch (err) {
                spinner.fail(`${chalk.cyan('Discord')}: Failed to send message`);
                console.log(err);
            }
        }
    } else if (parts[0] === pre + 'name') { //If we receive the name command, change the friendly name for a Particle device_id
        //Make sure device_id exists
        if (devices_storage.has(parts[1]) && parts[1] !== undefined) {
            let device = devices_storage.get(parts[1]);
            //Update device data
            devices_storage.set(parts[1], {
                device_name: parts[2],
                data: device.data,
                last_data_update: device.last_data_update,
                last_alert_update: device.last_alert_update,
                alert_freq_min: device.alert_freq_min
            });
            spinner.info(`${chalk.cyan('Discord')}: (id:` + parts[1] + `) Updated device_name to ` + parts[2] + ` for device due to "` + pre + `name" command`);
            //Send message to Discord channel, catch error if thrown
            try {
                await msg.channel.createMessage(parts[2] + ' (' + parts[1] + ') was successfully renamed');
            } catch (err) {
                spinner.fail(`${chalk.cyan('Discord')}: Failed to send message`);
                console.log(err);
            }
        } else {
            spinner.fail(`${chalk.cyan('Discord')}: <device_id> does not exist, responding with error`);
            //Send message to Discord channel, catch error if thrown
            try {
                await msg.channel.createMessage('ERROR: Particle <device_id> does not exist in database');
            } catch (err) {
                spinner.fail(`${chalk.cyan('Discord')}: Failed to send message`);
                console.log(err);
            }
        }
    }
    //Else, do nothing and ignore message
});

//Create a prettified status message for Discord
function get_status(device_id) {
    if (devices_storage.has(device_id)) {
        let device = devices_storage.get(device_id);
        return '**Device Details: ' + device.device_name + ' **(' + device_id + ')\n' +
            '> Batt Level | ' + device.data.loc.batt + "%\n" +
            '> Cell Strength | ' + device.data.loc.cell + '%\n' +
            '> Event Trigger | ' + device.data.trig + '\n' +
            '> GPS Coords | Lat: ' + device.data.loc.lat + ', ' +
            'Long: ' + device.data.loc.lon + '\n' +
            '> GPS Accuracy | Vert: ' + device.data.loc.v_acc + " m, " +
            'Hori: ' + device.data.loc.h_acc + " m\n" +
            '> Altitude | ' + device.data.loc.alt + " m\n" +
            '> Heading | ' + device.data.loc.hd + "°\n" +
            '> Temp | ' + (Math.round(((device.data.loc.temp*(9/5))+32)*100)/100) + "°F\n" +
            '> Last Heard | ' + moment(device.last_data_update).format('h:mm:ss a [on] MM/DD/YY Z [UTC]') + "\n" +
            '> Alert Frequency | At most every ' + device.alert_freq_min + " mins\n" +
            ' http://maps.apple.com/maps?q=' + device.data.loc.lat + ',' + device.data.loc.lon + '\n';
    } else {
        return 'ERROR: Particle <device_id> does not exist in database'
    }
}

//Handle any errors that the bot encounters
bot.on('error', err => {
    console.warn(err);
});
//End of Discord integration - - - - - - - - - - - - - - - - - - - - - - - - -

//API Webhooks - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
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

        //Make sure we have a GPS lock before updating GPS data
        if ((JSON.parse(req.body.data).loc.lat === undefined || JSON.parse(req.body.data).loc.lon === undefined) && device !== {}) {
            device.data.loc.cell = JSON.parse(req.body.data).loc.cell;
            device.data.loc.batt = JSON.parse(req.body.data).loc.batt;
            device.data.loc.temp = JSON.parse(req.body.data).loc.temp;
            device.data.trig = JSON.parse(req.body.data).trig;
            spinner.warn(`${chalk.yellow('API /api/particle/trackerone')}: Not updating device GPS data because there is no GPS lock`);
        } else {
            device.data = JSON.parse(req.body.data);
        }

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

        //Determine trigger reason
        let check_reason = "false";
        for (let sent_reason of JSON.parse(req.body.data).trig) {
            if (sent_reason === "radius") {
                check_reason = " has moved past its GPS radius threshold at ";
            } else if (sent_reason === "imu_m" || sent_reason === "img_g") {
                check_reason = " has detected a physical motion alert at ";
            }
        }

        //If the trigger reason is valid, check to see if we can send an alert
        if (check_reason !== "false") {
            //Send an alert if the freq has passed
            if (moment().isAfter(moment(device.last_alert_update).add(device.alert_freq_min, 'm'))) {
                device.last_alert_update = moment.unix(JSON.parse(req.body.data).time);
                spinner.info(`${chalk.yellow('API /api/particle/trackerone')}: (id:` + req.body.coreid + `) Event trigger reason is valid and is past the alert frequency, sending alert`);
                //Send message to Discord
                let message = '@everyone ' + device.device_name + check_reason + moment.unix(JSON.parse(req.body.data).time).format('h:mm:ss a [on] MM/DD/YY Z [UTC]');
                bot.createMessage(config_storage.get('discord_bot_channel'), message);
                spinner.info(`${chalk.cyan('Discord')}: ${chalk.yellow('API /api/particle/trackerone')} triggered message send to channel "` + message + `"`);
                //Prepare for status call on Discord
                last_alert_device_id = req.body.coreid;
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
        spinner.warn(`${chalk.yellow('API /api/particle/trackerone')}: Unauthorized POST request`);
        res.status(403).end();
    }
})

//Start express on defined port
spinner.start('Attempting to start API webserver');
app.listen(config_storage.get('api_port'), function () {
    //Successfully started webserver
    spinner.succeed('API http webserver running on port ' + config_storage.get('api_port'));
    //Start Discord bot
    spinner.start('Attempting to connect to Discord API');
    bot.connect();
})
//End of API Webhooks - - - - - - - - - - - - - - - - - - - - - - - - - - - - -