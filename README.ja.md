# Cardano CLI Wrapper

Websocket経由で cardano-cli 操作するための シンプルなWrapperサーバーです。  
トランザクションの作成・署名・HydraへのNewTx送信をサポートします。

## 特徴

- **WebSocket サーバー**: [Simple Hydra Client](https://github.com/bypptech/simple-hydra-client)からコマンドを受け取り一連の cardano-cli シーケンスを実行。
- **Hydra ノード連携**: 署名済みトランザクションをNewTxとしてHydraノードへ送信

## 動作要件

| 必要なツール            | バージョン / 詳細                          |
|-------------------------|--------------------------------------------|
| Node.js                | バージョン 16 以上推奨                     |
| cardano-node           | 10.1.2 [セットアップ済み](https://docs.cardano.org/cardano-testnets/getting-started) かつ 起動済み かつ Ledger同期100%         |
| cardano-cli            | 10.1.1.0                                   |
| hydra-node             | 0.20.0  [セットアップ済み](https://hydra.family/head-protocol/unstable/docs/tutorial#step-0-installation) かつ 起動済み                               |
| websocat               | 1.14.0 |
| curl                   | インストール済みであること                 |
| jq                     | インストール済みであること                 |

## インストール

### リポジトリ クローン

   ```bash
   git clone https://github.com/bypptech/cardano-cli-wrapper.git
   cd cardano-cli-wrapper
   npm install
   ```

### 環境設定



#### 1. テンプレートから環境設定用の .env を作成します

   ```bash
   cp .env.template .env
   ```

 #### 2. .env を編集し環境変数を設定します。

| 変数名               | 説明                                |
|-----------------------|-------------------------------------|
| SERVER_PORT          | cardano-cli-wrapperが使用するポート |
| URL_ALICE_HYDRA_NODE | Alice の Hydra ノードの URL         |
| URL_BOB_HYDRA_NODE   | Bob の Hydra ノードの URL           |
| PATH_PREFIX          | Cardano ノードのパス               |
| TARGET_NETWORK       | ネットワーク設定 (例: --testnet-magic 1) |
| TMP_COMMIT_FILE      | 一時的なコミットファイルのパス      |
| TMP_SIGNED_FILE      | 一時的な署名済みファイルのパス      |
| TMP_UTXO_FILE        | 一時的な UTXO ファイルのパス        |
| TMP_TX_FILE          | 一時的なトランザクションファイルのパス |
| SEND_LOVELACE        | NewTxで送信するADA(Lovelace) の量    |

#### 3.サーバー起動

   ```bash
   node cardano-cli-wrapper.js
   ```

#### 4. Simple Hydra Clinetから操作

[Simple Hydra Clinet](https://github.com/bypptech/simple-hydra-client)

##### サポートするコマンド

| コマンド名                | 説明                                |
|---------------------------|-------------------------------------|
| startCommitProcessAlice   | Alice のコミットプロセスを開始します。 |
| startCommitProcessBob     | Bob のコミットプロセスを開始します。   |
| getUtxoJSONAlice          | Alice の UTXO 情報を取得し,設定されたLovelaceをBobへ送信  |

