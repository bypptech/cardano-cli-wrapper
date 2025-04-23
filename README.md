# Cardano CLI Wrapper

A simple wrapper server for operating `cardano-cli` via WebSocket.  
Supports transaction creation, signing, and sending NewTx to Hydra.

## Features

- **WebSocket Server**: Receives commands from [Simple Hydra Client](https://github.com/bypptech/simple-hydra-client) and executes a sequence of `cardano-cli` operations.
- **Hydra Node Integration**: Sends signed transactions as NewTx to Hydra nodes.

## Requirements

| Required Tools         | Version / Details                                                                 |
|-------------------------|-----------------------------------------------------------------------------------|
| Node.js                | Version 16 or higher recommended                                                  |
| cardano-node           | 10.1.2 [Set up](https://docs.cardano.org/cardano-testnets/getting-started), running, and fully synced with the ledger |
| cardano-cli            | 10.1.1.0                                                                          |
| hydra-node             | 0.20.0 [Set up](https://hydra.family/head-protocol/unstable/docs/tutorial#step-0-installation) and running |
| websocat               | 1.14.0                                                                            |
| curl                   | Must be installed                                                                |
| jq                     | Must be installed                                                                |

## Installation

### Clone the Repository

   ```bash
   git clone https://github.com/bypptech/cardano-cli-wrapper.git
   cd cardano-cli-wrapper
   npm install
   ```

### Environment Configuration

#### 1. Create a `.env` file from the template

   ```bash
   cp .env.template .env
   ```

#### 2. Edit the `.env` file to set environment variables.

| Variable Name          | Description                              |
|-------------------------|------------------------------------------|
| SERVER_PORT            | Port used by the `cardano-cli-wrapper` server |
| URL_ALICE_HYDRA_NODE   | URL of Alice's Hydra node                |
| URL_BOB_HYDRA_NODE     | URL of Bob's Hydra node                  |
| PATH_PREFIX            | Path to the Cardano node                 |
| TARGET_NETWORK         | Network configuration (e.g., `--testnet-magic 1`) |
| TMP_COMMIT_FILE        | Path to the temporary commit file        |
| TMP_SIGNED_FILE        | Path to the temporary signed file        |
| TMP_UTXO_FILE          | Path to the temporary UTXO file          |
| TMP_TX_FILE            | Path to the temporary transaction file   |
| SEND_LOVELACE          | Amount of ADA (in Lovelace) to send in NewTx |

#### 3. Start the Server

   ```bash
   node cardano-cli-wrapper.js
   ```

#### 4. Operate via Simple Hydra Client

[Simple Hydra Client](https://github.com/bypptech/simple-hydra-client)

##### Supported Commands

| Command Name             | Description                              |
|---------------------------|------------------------------------------|
| startCommitProcessAlice   | Starts the commit process for Alice.     |
| startCommitProcessBob     | Starts the commit process for Bob.       |
| getUtxoJSONAlice          | Retrieves Alice's UTXO information and sends the specified Lovelace to Bob. |

