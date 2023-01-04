// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as dayjs from "dayjs";
import * as duration from "dayjs/plugin/duration";
import * as childProcess from "child_process";
import * as os from "os";

dayjs.extend(duration);

let statusBarItem: vscode.StatusBarItem;
let configOpts: vscode.WorkspaceConfiguration;
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "are-you-getting-off-work" is now active!');
	const commandId = 'are-you-getting-off-work.install';
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand(commandId, () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		// showNotification('')
	});
	statusBarItem =  vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

	statusBarItem.command = commandId;
	statusBarItem.text = 'are-you-getting-off-work';
	statusBarItem.show();
	context.subscriptions.push(disposable);
	context.subscriptions.push(statusBarItem);

	configOpts = vscode.workspace.getConfiguration('go-off-work');

	runExec();
}

let timer: NodeJS.Timer, hasShowNotification = false;

function countDown(fn: Function) {
	clearTimeout(timer);
	if (typeof timer === 'undefined') {
		fn();
	}

	timer = setTimeout(() => {
		fn();
		countDown(fn);
	}, 200);
}

function runExec() {
	countDown(() => {
		const configOpts = getConfiguration();
		const hour = configOpts.get('hour') as string, 
		minute = configOpts.get('minute') as string, 
		second = configOpts.get('second') as string, 
		enableShowNotification = configOpts.get('showNotification') as boolean,
		showOffWorkContent = configOpts.get('showOffWorkContent') as string,
		showContentAtStatusBar = configOpts.get('showContentAtStatusBar') as string,
		shutDownOnTime = configOpts.get('shutdown') as boolean,
		shutdownDelay = configOpts.get('shutdownDelay') as string;

		const now = dayjs();
		const offWorkTime = dayjs(`${now.format('YYYY-MM-DD')} ${hour}:${minute}:${second}`);
		const showText = offWorkTime.diff(now, 'millisecond');
		
		if (showText <= 0 && !hasShowNotification) {
			enableShowNotification && showNotification(showOffWorkContent);
			statusBarItem.text = showContentAtStatusBar;
			hasShowNotification = true;
			
			if (shutDownOnTime) {
				runShutDownCmd(shutdownDelay);
			}
		} else if (showText > 0) {
			statusBarItem.text = dayjs.duration(showText).format('HH:mm:ss');
			hasShowNotification = false;
			// statusBarItem.show();
		}
	});
}


function showNotification(info: string) {
	vscode.window.showInformationMessage(info);
}

function getConfiguration() {
	return vscode.workspace.getConfiguration('go-off-work');
}

function isWindowsPlatform() {
	const platform = os.platform();

	return platform === 'win32';
}

function runShutDownCmd(shutdownDelay: string) {
	const base = 60, delay = Number(shutdownDelay);
	// 设置为0后，可能会导致打开vscode，立即关机
	if (delay === 0 || Number.isNaN(delay)) {
		return;
	}
	if (isWindowsPlatform()) {
		execCommand('shutdown', ['/s', '/t', String(base * delay)]);
	}
}

function execCommand(cmd: string, args: string[]) {
	if (args.length > 0) {
		args.unshift(cmd);
		cmd = args.join(' ');
	}
	childProcess.exec(cmd, (error, stdout, stderr) => {
		if (error || stderr) {
			throw new Error(error?.message || stderr);
		}

		console.log(`[Run Command ${cmd}]\t${stdout}`);
	});
}

// This method is called when your extension is deactivated
export function deactivate() {
	clearTimeout(timer);
	timer = undefined as any;
	hasShowNotification = false;
}
