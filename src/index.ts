import * as dotenv from "dotenv";
dotenv.config();
import { Collection, Client, Message } from "discord.js";
import { CommandCollector } from "./types/command.type";
import { botCommands } from "./commands";
import * as channelBindingService from "./services/channelBindingService";
import * as commandEnablingService from "./services/commandEnablingService";
// TODO - refactor `require`uses to typescript imports
const constants = require("./config/constants").constants;

class ExtendedClient extends Client {
  /**
   * Hashmap of string->Command
   */
  public commands: CommandCollector = new Collection();
}

const client = new ExtendedClient();
const commandsCollection: CommandCollector = new Collection(Object.entries(botCommands));

/**
 * Enabled commands processing
 */
commandEnablingService.enableCommands(commandsCollection);

/**
 * Check which commands have binding definitions and add them to the commandInstance
 */
channelBindingService.processBindings(commandsCollection);

client.on("message", (msg: any) => {
// Send our bot commands to the client
client.commands = commandsCollection;
  /**
   * Don't process bot messages, could be even more specific to ignore self messages.
   */
  if (msg.author.bot) {
    return;
  }
  const args = msg.content.split(/ +/);
  const command = args.shift().toLowerCase().substr(1);
  const options: any = {};

  if (!client.commands.has(command)) return;

  const commandInstance = client.commands.get(command);
  /**
   * Check if command instance exists in given key index
   */
  if (!commandInstance) return;

  /**
   * Check whether the command is enabled - if it is not - ignore and exit processing
   */
  if (!commandInstance.enabled) return;

  /**
   * Check if the command has channel bindings defined.
   * If there are no bindings - the command should be allowed to execute everywhere
   * If the bindings are present, the command should be executed only in the channels
   * with matching IDs
   */
  if (commandInstance.bindings && !channelBindingService.isCommandAllowed(commandInstance, msg)) {
    return;
  }

  try {
    console.log(`called command: ${commandInstance.name}`);
    if (command === "!help") options.commands = client.commands;
    options.constants = constants;
    commandInstance.execute(msg, args, options);
  } catch (error) {
    console.error(error);
    msg.reply("Something broke and that last command did not work.");
  }
});

const TOKEN = process.env.TOKEN;

client.on("ready", () => {
  client.user ?
    console.log(`Logged in as ${client.user.tag}!`) : console.log(`Logged in without defined user`);
  ;
});

client.login(TOKEN);
