import * as vscode from 'vscode';
import { exec } from 'child_process';

//grab NightCrawlerCmds from env
const NightCrawlerCmds = process.env.POST_RUN_CMDS;

// grab NightCrawlerDelay from env
const envNightCrawlerDelay = process.env.POST_RUN_CMDS_MAIN_DELAY;

// parse envNightCrawlerDelay to int
const NightCrawlerDelay = envNightCrawlerDelay ? parseInt(envNightCrawlerDelay) : 5000;


// get current extension version
const extensionVersion = vscode.extensions.getExtension('nightcrawler.nightcrawlerrunner')?.packageJSON.version;
var modLabel = "[NightCrawlerRunner " + extensionVersion + "] ";

export const runSysCommand = async (command: string): Promise<{ stdout: string; stderr: string }> => {
	return new Promise((resolve, reject) => {
		exec(command, { encoding: 'utf-8' }, (error, stdout, stderr) => {
			if (error) {
				reject(new Error(`Execution failed: ${error.message}`));
				return;
			}
			resolve({ stdout, stderr });
		});
	});
};



async function writeMessage(msg: string, log: boolean = true, vsc: boolean = false) {
	if (log) { console.log(modLabel + msg); }
	if (vsc) { await vscode.window.showInformationMessage(modLabel + msg); };
}
async function writeErrorMessage(msg: string, log: boolean = true, vsc: boolean = false) {
	if (log) { console.log(modLabel + "[Error] " + msg); }
	if (vsc) { await vscode.window.showInformationMessage(modLabel + msg); };
}
// create CommandType enum
enum CommandType {
	extension = 'extension',
	system = 'system',
	unknown = 'unknown'
}
enum CommandStatus {
	pending = 'pending',
	completed = 'completed',
	failed = 'failed'
}
// create CommandProcess class
class CommandProcess {
	command: string;
	type: CommandType;
	status: CommandStatus;
	constructor(command: string, type: CommandType) {
		this.command = command;
		this.type = type;
		this.status = CommandStatus.pending;
	}
}

//create function to create CommandProcess from NightCrawlerCmds
function LoadCommands(): CommandProcess[] {
	const commands = NightCrawlerCmds ? NightCrawlerCmds.split('\n') : [];
	const result: CommandProcess[] = [];
	commands.forEach((cmd) => {
		cmd = cmd.trim();
		const type = cmd.startsWith('vsc:') ? CommandType.extension : CommandType.system;
		cmd = cmd.startsWith('vsc:') ? cmd.replace("vsc:", "") : cmd;
		cmd = cmd.startsWith('sys:') ? cmd.replace("sys:", "") : cmd;

		result.push(new CommandProcess(cmd, type));
	});
	return result;
}

const executeCommand = async (theCommand: CommandProcess) => {
	const commands = theCommand.command.split(" ");
	if (commands.length < 1) {
		return;
	}
	const [cmd, ...args] = commands;
	return new Promise<void>((resolve) => {
		setTimeout(async () => {
			try {
				await writeMessage(`Start executing :${theCommand.command}`, true, true);
				if (theCommand.type === CommandType.extension) {
					const vscodePID = process.ppid; // Get parent process ID (VS Code's PID)
					console.log(`[Extension] Running inside VS Code process PID: ${vscodePID}`);
					vscode.commands.executeCommand(cmd, ...args).then(() => {
						console.log("[Extension] New VS Code window launched.");
						
						// Kill the initial VS Code process after a delay
						setTimeout(() => {
							try {
								exec(`kill ${vscodePID}`);
								console.log(`[Extension] Killed initial VS Code process: ${vscodePID}`);
							} catch (e) {
								console.log(`[Extension] Failed to kill initial VS Code process: ${e}`);
							}
						}, 5000); // Adjust delay if needed
					});
				}
				else {
					await runSysCommand(theCommand.command);
				}
				await writeMessage(`Command executed ! :${theCommand.command}`, true, true);
				theCommand.status = CommandStatus.completed;
				resolve();
			} catch (exception) {
				theCommand.status = CommandStatus.failed;
				await writeErrorMessage(`[${theCommand.command}] raised an error -> [${exception}]`, true, true);
				resolve();
			}
		}, NightCrawlerDelay);
	});
};


function initializeNightCrawler() {

	// if no NightCrawlerCmds are found in env return
	if (!NightCrawlerCmds) {
		writeMessage('Is alive but NOT kicking ! No NightCrawlerCmds were found in environment !');
		return;
	}
	const commands = LoadCommands();
	// if no commands are found return
	if (commands.length === 0) {
		writeMessage('Is alive but NOT kicking ! No commands were found in environment !');
		return;
	}

	// if commands are found return
	writeMessage('Is alive and kicking ! ...  and commands were found in environment !', true, true);
	writeMessage('cmds = ' + NightCrawlerCmds, true, true);

	const processCommandsSequentially = async () => {


		var cmds = commands;
		cmds.forEach(cmd => {
			cmd.status = CommandStatus.pending;

		});
		const processCommand = async (cmd: CommandProcess) => {

			try {

				for (const cmd of commands) {
					await executeCommand(cmd);

				}
			} catch (e) {
				cmd.status = CommandStatus.failed;
				await vscode.window.showErrorMessage(`[Auto Run Command] ${e}`);
			}
		};

		while (cmds.some(cmd => cmd.status !== CommandStatus.completed)) {
			await Promise.all(
				cmds.map(async (cmd) => {
					if (cmd.status !== CommandStatus.completed) {
						await processCommand(cmd);
					}
				})
			);
		}


	};

	processCommandsSequentially();


}
export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, the extension "NightCrawlerRunner" is now active!');
	initializeNightCrawler();
}

// This method is called when the extension is deactivated
export function deactivate() {
	console.log('The extension "NightCrawlerRunner" is now deactivated!');
}
