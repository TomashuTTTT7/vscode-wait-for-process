import * as vscode from 'vscode';
import { execFile } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

function execFileAsync(path: string, args: string[]): Promise<string> {
	return new Promise((resolve, reject) => {
		execFile(path, args, {
			encoding: 'utf8',
			maxBuffer: 1024 * 1024 * 5
		}, (error, stdout) => {
			if (error) {
				reject(error);
			} else {
				resolve(stdout);
			}
		});
	});
}

type ModuleInfo = {
	processName: string,
	moduleIndex: string,
	pid: string,
	moduleName: string
};

async function enumerateProcesses(helperPath: string): Promise<ModuleInfo[]> {
	const output = await execFileAsync(helperPath, []);
	const lines = output.split('\n');

	return lines.map((line) => {
		line = line.trim();
		const parts = line.split(':');
		return {
			pid: parts[0],
			moduleIndex: parts[1],
			processName: parts[2],
			moduleName: parts[3]
		};
	});
}

const timeout = (ms: number) => new Promise(res => setTimeout(res, ms));

async function getMatchingProcesses(helperPath: string, options: { processName?: string, moduleName?: string }): Promise<ModuleInfo[]> {
	const moduleInfos = await enumerateProcesses(helperPath);

	if (options.moduleName === "ntdll.dll") {
		// everybody links to ntdll.dll, therefore remove the filter
		options.moduleName = undefined;
	}

	const allProcesses = !options.moduleName && !options.processName;

	return moduleInfos.filter((info) => {
		if (allProcesses) {
			return info.moduleIndex === "1";
		}

		if (options.processName && options.moduleName) {
			if (!info.moduleName) {
				return false;
			}
			return info.processName === options.processName && info.moduleName === options.moduleName;
		}

		if (options.processName) {
			return info.processName === options.processName && info.moduleIndex === "1";
		}

		if (options.moduleName) {
			if (!info.moduleName) {
				return false;
			}
			return info.moduleName === options.moduleName;
		}

		return true;
	}).filter(info => info !== null);
}

async function watchForMatchingProcess(helperPath: string, options: { processName?: string, moduleName?: string }): Promise<ModuleInfo[]> {
	let waitMessage = 'Waiting for any process';
	if (options.processName && options.moduleName) {
		waitMessage = `Waiting for process matching ${options.processName} and with module ${options.moduleName}`;
	} else if (options.processName) {
		waitMessage = `Waiting for process matching ${options.processName}`;
	} else if (options.moduleName) {
		waitMessage = `Waiting for process with module ${options.moduleName}`;
	}

	return await vscode.window.withProgress({ cancellable: true, location: vscode.ProgressLocation.Notification, title: waitMessage }, async (progress, token) => {
		let timelimit = 60000;
		let period = 500;
		let prog = 0;
		for (let time = 0; time <= timelimit && !token.isCancellationRequested; time += period) {
			let prognew = (time*100)/timelimit;
			progress.report({ increment: prognew - prog });
			prog = prognew;
			
			const matches = await getMatchingProcesses(helperPath, options);
			if (matches.length > 0) {
				return matches;
			}

			console.log("No matching processes, trying again");
			await timeout(period);
		}

		return [];
	});
}

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('wait-for-process-fork.wait', async (options: { processName?: string, moduleName?: string }) => {
		options = options || {};

		const helperPath = path.join(context.extensionPath, 'helper', 'wait-for-process.exe');

		if (!fs.existsSync(helperPath)) {
			vscode.window.showErrorMessage('Helper not available');
			return;
		}

		const processes = await watchForMatchingProcess(helperPath, options);
		if (processes.length === 0) {
			vscode.window.showErrorMessage("No matching process found");
			return;
		} else if (processes.length === 1) {
			vscode.window.showInformationMessage(`Found matching process ${processes[0].pid}`);
			return processes[0].pid;
		}

		const quickPickItems = processes.map((info) => {
			return {
				label: info.processName,
				detail: info.pid,
				description: info.moduleName
			};
		});

		const pickedItem = await vscode.window.showQuickPick(quickPickItems, { matchOnDescription: true, matchOnDetail: true });
		if (pickedItem) {
			return pickedItem.detail;
		}

		return undefined;
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }
