import fs from 'fs';

const logFile = './logs/app.log';

function writeLog(line) {
    fs.appendFileSync(logFile, line + '\n');
}

function info(message) {
    const dataHora = new Date();
    writeLog(`[${dataHora}] [info] [${message}]`);
}

function warn(message) {
    const dataHora = new Date();
    writeLog(`[${dataHora}] [warn] [${message}]`);
}

function error(message, err) {
    const dataHora = new Date();
    writeLog(`[${dataHora}] [error] [${message}]`);
    if (err) writeLog(err.stack || err.toString());
}

export const logger = { info, warn, error };