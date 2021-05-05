# Particlecord
[![Build Status](https://travis-ci.org/RAK3RMAN/particlecord.svg?branch=main)](https://travis-ci.org/RAK3RMAN/particlecord)
![Language](https://img.shields.io/badge/language-Node.js-informational.svg?style=flat)

A Discord bot that sends event-based alerts from Particle.io devices

## Purpose
Particlecord listens for events from Particle.io devices and parses this data into manageable alerts.
Think of Particlecord as an "API middleman" that links together a real-time data stream from Particle.io and sending push notifications through Discord.
A large portion of this project is built around Particle events from Particle's Tracker One.
Tracker One is an electronics package that monitors the location of an asset using GPS and motion alerts.
Particlecord leverages these events by sending push notifications to a Discord channel anytime Tracker One moves.
Particlecord can handle multiple named devices and is easily customizable to monitor any type of event.

## Install
As easy as 1, 2, 3.
1. Clone the repo and enter the directory: ``git clone https://github.com/rak3rman/particlecord.git && cd particlecord``
2. Install packages: ``npm install``
2. Run project: ``npm run start``

## Usage
### Configuration
After the first run of particlecord, a config file will be created in the config folder with path ``/config.json``.
This file stores all the environment variables needed for the project, which can be edited when the instance is not running.
The config file will be populated with the following default values:
- ``"api_port": 3000`` Port where the api webserver will accept incoming connections, of type int
- ``"webhook_secret": "random_string_here"`` A random string generated server side for the Discord bot.
- ``"discord_bot_token": "random_string_generated_here"``
- ``"discord_bot_channel": "discord_channel_here"``
- ``"discord_bot_prefix": "!"`` The character that the Discord bot listens to. ! is the default, so !help will display the commands.

**NOTE:** Make sure to stop the instance of particlecord before changing any of these values. If the file is modified while an instance is active, the changes will be overridden.

### Running the project
The npm package supports multiple ways to run the project.
- ``npm run start`` Runs the project, plain and simple.
- ``npm run develop`` Starts the project and watches for all file changes. Restarts the instance if critical files are updated. Must have nodemon installed.
- ``npm run test`` Runs a few tests for Travis-CI. Nothing crazy here.

Use ``^C`` to exit any of these instances. Currently, there are no exit commands or words.

### Particlecord commands
- ``!help`` Displays all Particlecord commands
- ``!status`` Returns more details from the last alert
- ``!devices`` Returns all known devices
- ``!details <device_id>`` Returns all details for a Particle device_id
- ``!alert_freq <device_id> <freq_in_min>`` Sets the alert frequency in terms of minutes for a device, use 0 for verbose alerts
- ``!name <device_id> <friendly_name>`` Changes the friendly name for a Particle device_id

### Development
The framework behind this project is not new in the slightest. In fact, [many articles](https://www.section.io/engineering-education/discord-bot-node/) describe how to make a Discord bot using Node.js and explain the basics better than I can. If you'd like to make a Discord bot yourself I would highly suggest checking out these resources.

## Contributors
- **Radison Akerman** / Project Lead

*Individual contributions are listed on most functions*

## License
This project (particlecord) is protected by the Mozilla Public License 2.0 as disclosed in the [LICENSE](https://github.com/rak3rman/particlecord/blob/main/LICENSE). Adherence to the policies and terms listed is required.