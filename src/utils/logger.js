function info(message) {
    const dataHora = new Date();
    console.log(`[${dataHora}] [info] [${message}]`);  
}

function warn(message) {
    const dataHora = new Date();
    console.log(`[${dataHora}] [warn] [${message}]`);    
}

function error(message, err) {
    const dataHora = new Date();
    console.log(`[${dataHora}] [error] [${message}]`)
    if (err) console.log(err); 
}

export const logger = { info, warn, error };