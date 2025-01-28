# NightCrawlerRunner Extension

NightCrawlerRunner is a VS Code extension that executes a sequence of commands automatically when VS Code starts up. It supports both VS Code commands and system commands.

## Features

- Automatically executes commands on VS Code startup
- Supports VS Code extension commands (prefix: `vsc:`)
- Supports system commands (prefix: `sys:`)
- Configurable delays between command execution
- Error handling and status reporting

## Requirements

- VS Code 1.96.0 or higher

## Extension Settings

This extension uses environment variables for configuration:

* `POST_RUN_CMDS`: List of commands to run (separated by newlines)
* `POST_RUN_CMDS_MAIN_DELAY`: Delay in milliseconds between commands (default: 5000)

Example configuration in launch.json:
```json
{
    "env": {
        "POST_RUN_CMDS": "vsc:remote-containers.attachToRunningContainer containerId \n vsc:workbench.action.closeWindow",
        "POST_RUN_CMDS_MAIN_DELAY": "5000"       
    }
}