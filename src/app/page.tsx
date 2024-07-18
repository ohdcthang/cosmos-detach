'use client'

import { bech32 } from "bech32";
import { mnemonicToSeed } from "bip39";
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";
import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import { rawSecp256k1PubkeyToRawAddress } from "./amino/addresses";
import { compressPubkey, makeKeypair } from "./crypto/secp256k1";
import { Slip10, Slip10Curve, stringToPath } from "./crypto/slip10";
import { sendTokens, signAndBroadcast } from "./signing";

export function toUtf8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

export default function Home() {
  // const priv = Buffer.from('84174d395ab1653f41904454a2885f61196cb624c6cc1dafccfc93bdeb99f05b', 'hex')

  // const huhu = async () => {
  //   const uncompressed =  (await makeKeypair(priv)).pubkey
  //   console.log("🚀 ~ huhu ~ uncompressed:", uncompressed)

  //   const publickey = compressPubkey(uncompressed)

  //   const words = bech32.toWords(rawSecp256k1PubkeyToRawAddress(publickey))
  //   const address = bech32.encode('cosmos', words)
  //   console.log("🚀 ~ huhu ~ address:", address)



  // }

interface ExecuteResult {
  /** @deprecated Not filled in Cosmos SDK >= 0.50. Use events instead. */
  readonly logs: any;
  /** Block height in which the transaction is included */
  readonly height: number;
  /** Transaction hash (might be used as transaction ID). Guaranteed to be non-empty upper-case hex */
  readonly transactionHash: string;
  readonly events: readonly Event[];
  readonly gasWanted: bigint;
  readonly gasUsed: bigint;
}

const isDeliverTxFailure = (result: any): boolean => {
  return !!result.code;
}

function createDeliverTxResponseErrorMessage(result: any): string {
  return `Error when broadcasting tx ${result.transactionHash} at height ${result.height}. Code: ${result.code}; Raw log: ${result.rawLog}`;
}
interface ExecuteInstruction {
  contractAddress: string;
  msg: any;
  funds?: readonly Coin[];
}

const executeMultiple = async (
    privateKey: string,
    senderAddress: string,
    instructions: readonly ExecuteInstruction[],
    fee: any,
    memo = "",
  ): Promise<ExecuteResult> => {
    const msgs: any[] = instructions.map((i) => ({
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: senderAddress,
        contract: i.contractAddress,
        msg: toUtf8(JSON.stringify(i.msg)),
        funds: [...(i.funds || [])],
      }), 
    }));
    const result = await signAndBroadcast(privateKey, senderAddress, msgs, fee, memo);
    if (isDeliverTxFailure(result)) {
      throw new Error(createDeliverTxResponseErrorMessage(result));
    }
    return {
      logs: parseRawLog(result.rawLog),
      height: result.height,
      transactionHash: result.transactionHash,
      events: result.events,
      gasWanted: result.gasWanted,
      gasUsed: result.gasUsed,
    };
  }
  interface Log {
    readonly msg_index: number;
    readonly log: string;
    readonly events: readonly Event[];
  }
  
  function isNonNullObject(data: unknown): data is object {
    return typeof data === "object" && data !== null;
  }

  function parseEvent(input: unknown): Event {
    if (!isNonNullObject(input)) throw new Error("Event must be a non-null object");
    const { type, attributes } = input as any;
    if (typeof type !== "string" || type === "") {
      throw new Error(`Event type must be a non-empty string`);
    }
    if (!Array.isArray(attributes)) throw new Error("Event's attributes must be an array");
    return {
      type: type,
      attributes: attributes.map(parseAttribute),
    };
  }

  function parseLog(input: unknown): Log {
    if (!isNonNullObject(input)) throw new Error("Log must be a non-null object");
    const { msg_index, log, events } = input as any;
    if (typeof msg_index !== "number") throw new Error("Log's msg_index must be a number");
    if (typeof log !== "string") throw new Error("Log's log must be a string");
    if (!Array.isArray(events)) throw new Error("Log's events must be an array");
    return {
      msg_index: msg_index,
      log: log,
      events: events.map(parseEvent),
    };
  }

  function parseLogs(input: unknown): readonly Log[] {
    if (!Array.isArray(input)) throw new Error("Logs must be an array");
    return input.map(parseLog);
  }

  function parseRawLog(input: string | undefined): readonly Log[] {
    // Cosmos SDK >= 0.50 gives us an empty string here. This should be handled like undefined.
    if (!input) return [];
  
    const logsToParse = JSON.parse(input).map(({ events }: { events: readonly unknown[] }, i: number) => ({
      msg_index: i,
      events,
      log: "",
    }));
    return parseLogs(logsToParse);
  }
  




  const execute = async(
    privateKey: string,
    senderAddress: string,
    contractAddress: string,
    msg: any,
    fee: any | "auto" | number,
    memo = "",
    funds?: readonly Coin[],
  ): Promise<ExecuteResult>  => {
    const instruction: ExecuteInstruction = {
      contractAddress: contractAddress,
      msg: msg,
      funds: funds,
    };
    return executeMultiple( privateKey, senderAddress, [instruction], fee, memo);
  }


  const huhu = async () => {
    // const mnemonic = 'rude elegant example license casual work polar end lift define broken air'
    // const seed = await mnemonicToSeed(mnemonic)

    // const { privkey } = Slip10.derivePath(Slip10Curve.Secp256k1, seed, stringToPath("m/44'/118'/0'/0/0"));
    // console.log("🚀 ~ huhu ~ privkey:", privkey)

    // const uncompressed =  (await makeKeypair(privkey)).pubkey
    // console.log("🚀 ~ huhu ~ uncompressed:", uncompressed)

    // const publickey = compressPubkey(uncompressed)

    // const words = bech32.toWords(rawSecp256k1PubkeyToRawAddress(publickey))
    // const address = bech32.encode('cosmos', words)
    // console.log("🚀 ~ huhu ~ address:", address)

    const data = await execute(
      'fd565e44d235cea04bfa677abd1637b5145449334efdca2bf35312f32943f512',
      'sei1cc6aptpscmq36klelwp057lckm6nvr3ygmywxx',
      'sei12ne7qtmdwd0j03t9t5es8md66wq4e5xg9neladrsag8fx3y89rcs5m2xaj',
      {
        "transfer_nft": {
            "recipient": "sei1cc6aptpscmq36klelwp057lckm6nvr3ygmywxx",
            "token_id": "C98LyEwBeZkpQKGNqlR"
        }
      },
      {
        "amount": [
            {
                "denom": "usei",
                "amount": "6000"
            }
        ],
        "gas": "200000"
      }
    )

    // const data = await sendTokens(
    console.log("🚀 ~ huhu ~ data:", data)
    //   '84174d395ab1653f41904454a2885f61196cb624c6cc1dafccfc93bdeb99f05b',
    //   'cosmos1s9x5442jzz6xxfsdf2v7hmvasrxpx3d0euwwye',
    //   'cosmos1s9x5442jzz6xxfsdf2v7hmvasrxpx3d0euwwye',
    //   [{
    //     "amount": "1000",
    //     "denom": "uatom"
    //   }],
    //   {
    //     "gas": "130000",
    //     "amount": [
    //         {
    //             "denom": "uatom",
    //             "amount": "3251"
    //         }
    //     ]
    //   }
    // )

    // console.log("🚀 ~ huhu ~ data:", data)

  }

  huhu()


  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      Victoria xao quyet
    </main>
  );
}