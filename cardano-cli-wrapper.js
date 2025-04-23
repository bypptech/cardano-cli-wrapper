import WebSocket, { WebSocketServer } from 'ws';
import { exec } from 'child_process';
import { readFile } from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

const URL_ALICE_HYDRA_NODE = process.env.URL_ALICE_HYDRA_NODE;
const URL_BOB_HYDRA_NODE = process.env.URL_BOB_HYDRA_NODE;

const PATH_PREFIX = process.env.PATH_PREFIX;
const PATH_CREDENTIALS = `${PATH_PREFIX}/credentials`;
const CARDANO_SOCKET_PATH = `${PATH_PREFIX}/node.socket`;

const PATH_ALICE_FUND_ADDR = `${PATH_CREDENTIALS}/alice-funds.addr`;
const PATH_ALICE_FUND_SKEY = `${PATH_CREDENTIALS}/alice-funds.sk`;
const PATH_BOB_FUND_ADDR = `${PATH_CREDENTIALS}/bob-funds.addr`;
const PATH_BOB_FUND_SKEY = `${PATH_CREDENTIALS}/bob-funds.sk`;

const TARGET_NETWORK = process.env.TARGET_NETWORK;

const TMP_COMMIT_FILE = process.env.TMP_COMMIT_FILE;
const TMP_SIGNED_FILE = process.env.TMP_SIGNED_FILE;
const TMP_UTXO_FILE = process.env.TMP_UTXO_FILE;
const TMP_TX_FILE = process.env.TMP_TX_FILE;

const SEND_LOVELACE = process.env.SEND_LOVELACE;

const CMD_QUERY_UTXO = `cardano-cli query utxo --socket-path ${CARDANO_SOCKET_PATH} --output-json `;
const CMD_ALICE_HYDRA_COMMIT = `curl -X POST ${URL_ALICE_HYDRA_NODE}/commit `;
const CMD_BOB_HYDRA_COMMIT = `curl -X POST ${URL_BOB_HYDRA_NODE}/commit `;
const CMD_SIGN = `cardano-cli latest transaction sign ${TARGET_NETWORK} --out-file ${TMP_SIGNED_FILE} `;
const CMD_SUBMIT = `cardano-cli latest transaction submit --tx-file ${TMP_SIGNED_FILE} ${TARGET_NETWORK} --socket-path ${CARDANO_SOCKET_PATH} `;

const CMD_ALICE_GET_UTXO_JSON = `curl -s ${URL_ALICE_HYDRA_NODE}/snapshot/utxo \
  | jq "with_entries(select(.value.address == \\"$(cat ${PATH_ALICE_FUND_ADDR})\\"))" > ${TMP_UTXO_FILE}`;
const CMD_BOB_GET_UTXO_JSON = `curl -s ${URL_BOB_HYDRA_NODE}/snapshot/utxo \
  | jq "with_entries(select(.value.address == \\"$(cat ${PATH_BOB_FUND_ADDR})\\"))" > ${TMP_UTXO_FILE}`;

const CMD_ALICE_TRANSACTION_BUILD_RAW = `cardano-cli latest transaction build-raw \
  --tx-in $(jq -r 'to_entries[0].key' < ${TMP_UTXO_FILE}) \
  --tx-out $(cat ${PATH_BOB_FUND_ADDR})+${SEND_LOVELACE} \
  --tx-out $(cat ${PATH_ALICE_FUND_ADDR})+$(jq "to_entries[0].value.value.lovelace - ${SEND_LOVELACE}" < ${TMP_UTXO_FILE}) \
  --fee 0 \
  --out-file ${TMP_TX_FILE}`;

const CMD_ALICE_L2_TRANSACTION_SIGN = `cardano-cli latest transaction sign \
  --tx-body-file ${TMP_TX_FILE} \
  --signing-key-file ${PATH_ALICE_FUND_SKEY} \
  --out-file ${TMP_SIGNED_FILE}`;

const CMD_HYDRA_NEWTX = `cat ${TMP_SIGNED_FILE} | jq -c '{tag: "NewTx", transaction: .}' | websocat "ws://${URL_ALICE_HYDRA_NODE}?history=no"`;

const wss = new WebSocketServer({ port: process.env.SERVER_PORT });

wss.on('connection', function connection(ws) {
    console.log('Client connected');

    ws.on('message', function message(data) {
        const command = data.toString();
        console.log('Received command:', command);

        switch (command) {
            case 'startCommitProcessAlice':
                startCommitProcess('alice');
                break;
            case 'startCommitProcessBob':
                startCommitProcess('bob');
                break;
            case 'getUtxoJSONAlice':
                getUtxoJSON('alice');
                break;
            default:
                ws.send(JSON.stringify({ error: 'Unknown command' }));
                break;
        }

        exec(command, (err, stdout, stderr) => {
            if (err) {
                ws.send(JSON.stringify({ error: stderr }));
                return;
            }
            ws.send(JSON.stringify({ output: stdout }));
        });
    });
});

console.log(`cardano-cli-wrapper server started on ws://localhost:${wss.options.port}`);

export function startCommitProcess(user) {
    console.log('INFO:Starting commit process...');

    if (user === 'alice') {
        console.log('INFO:Fetching Alice\'s UTXO...');
        queryUtxo(user, PATH_ALICE_FUND_ADDR);
    }
    else if (user === 'bob') {
        console.log('INFO:Fetching Bob\'s UTXO...');
        queryUtxo(user, PATH_BOB_FUND_ADDR);
    }
    else {
        console.log(`ERROR:${user} is an invalid user.`);
    }
    return;
}

export function queryUtxo(user, addressPath) {
    const cmd = CMD_QUERY_UTXO + `--address $(cat ${addressPath})`;
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`ERROR:queryUtxo execution error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`WARN:queryUtxo stderr: ${stderr}`);
            return;
        }
        console.log(`OK:queryUtxo result:\n${stdout}`);
        hydraCommitUtxo(user, stdout);
    });
}

export function hydraCommitUtxo(user, utxoData) {
    const formatUtxoData = utxoData.replace(/\n/g, "").replace(/ /g, "").replace(/"/g, '\\"');

    let tmpCmd;
    if (user === 'alice') {
        console.log('INFO:Committing Alice\'s UTXO...');
        tmpCmd = CMD_ALICE_HYDRA_COMMIT;
    } else if (user === 'bob') {
        console.log('INFO:Committing Bob\'s UTXO...');
        tmpCmd = CMD_BOB_HYDRA_COMMIT;
    } else {
        console.log(`ERROR:${user} is an invalid user.`);
        return;
    }
    const cmd = tmpCmd + `--data \"${formatUtxoData}\" > ${TMP_COMMIT_FILE}`;
    console.log(`INFO:hydraCommitUtxo command: ${cmd}`);
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`ERROR:hydraCommitUtxo execution error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`WARN:hydraCommitUtxo stderr: ${stderr}`);
        }
        console.log(`OK:hydraCommitUtxo result:\n${stdout}`);
        transactionSign(user, stdout);
    });
}

export function transactionSign(user, txFile) {
    let tmpSignKey;
    if (user === 'alice') {
        console.log('INFO:Signing Alice\'s transaction...');
        tmpSignKey = `--signing-key-file ${PATH_ALICE_FUND_SKEY} `;
    }
    else if (user === 'bob') {
        console.log('INFO:Signing Bob\'s transaction...');
        tmpSignKey = `--signing-key-file ${PATH_BOB_FUND_SKEY} `;
    }
    else {
        console.log(`ERROR:${user} is an invalid user.`);
        return;
    }
    const cmd = CMD_SIGN + tmpSignKey + `--tx-file ${TMP_COMMIT_FILE}`;
    console.log(`INFO:transactionSign command: ${cmd}`);

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`ERROR:Execution error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`WARN:stderr: ${stderr}`);
        }
        console.log(`OK:Result:\n${stdout}`);
        transactionSubmit(stdout);
    });
}

export function transactionSubmit(txFile) {
    exec(CMD_SUBMIT, (error, stdout, stderr) => {
        if (error) {
            console.error(`ERROR:Execution error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`WARN:stderr: ${stderr}`);
            return;
        }
        console.log(`OK:Result:\n${stdout}`);
    });
}

function getUtxoJSON(user) {
    let cmd;
    if (user === 'alice') {
        cmd = CMD_ALICE_GET_UTXO_JSON;
    } else if (user === 'bob') {
        cmd = CMD_BOB_GET_UTXO_JSON;
    } else {
        console.log(`ERROR:getUtxoJSON ${user} is an invalid user.`);
        return;
    }

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`ERROR:getUtxoJSON execution error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`WARN:getUtxoJSON stderr: ${stderr}`);
            return;
        }
        console.log(`OK:getUtxoJSON result:\n${stdout}`);

        exec(CMD_ALICE_TRANSACTION_BUILD_RAW, (error, stdout, stderr) => {
            if (error) {
                console.error(`ERRO:RgetUtxoJSON2 execution error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`WARN:getUtxoJSON2 stderr: ${stderr}`);
                return;
            }
            console.log(`OK:getUtxoJSON2 result:\n${stdout}`);
            
            exec(CMD_ALICE_L2_TRANSACTION_SIGN, (error, stdout, stderr) => {
                if (error) {
                    console.error(`ERROR:getUtxoJSON3 execution error: ${error.message}`);
                    return;
                }
                if (stderr) {
                    console.error(`WARN:getUtxoJSON3 stderr: ${stderr}`);
                    return;
                }
                console.log(`OK:getUtxoJSON2 result:\n${stdout}`);

                exec(CMD_HYDRA_NEWTX, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`ERROR:getUtxoJSON3 execution error: ${error.message}`);
                        return;
                    }
                    if (stderr) {
                        console.error(`WARN:getUtxoJSON3 stderr: ${stderr}`);
                        return;
                    }
                    console.log(`OK:getUtxoJSON3 result:\n${stdout}`);
                });
            });
        });
    });
}

async function getUtxoJSONByAddress(user, utxoJSON) {
    let targetAddress;
    if (user === 'alice') {
        targetAddress = (await readFile(PATH_ALICE_FUND_ADDR, 'utf8')).trim();
        console.log(`INFO targetAddress: ${targetAddress}`);
    } else if (user === 'bob') {
        targetAddress = await readFile(PATH_BOB_FUND_ADDR, 'utf8');
    } else {
        console.log(`ERROR ${user} is an invalid user.`);
        return;
    }

    Object.values(utxoJSON).forEach((val, i) => {
        console.log(`INFO ${i}: ${val.address}`);
    });
    const filtered = Object.fromEntries(
        Object.entries(utxoJSON).filter(
            ([_, val]) => val.address === targetAddress
        )
    );

    console.log(`OK getUtxoJSONByAddress result:\n${JSON.stringify(filtered)}`);
}
