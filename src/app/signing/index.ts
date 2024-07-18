import { Coin } from 'cosmjs-types/cosmos/base/v1beta1/coin';
import { SignMode } from 'cosmjs-types/cosmos/tx/signing/v1beta1/signing';
import { AuthInfo, SignDoc, SignerInfo, TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import { Any } from 'cosmjs-types/google/protobuf/any';
import { get } from 'lodash-es'
import { encodePubkey, encodeSecp256k1Pubkey } from '../amino/addresses';
import { fromBase64, toBase64 } from '../crypto/base64';
import { Int53 } from '../crypto/math';
import { compressPubkey, createSignature, makeKeypair } from '../crypto/secp256k1';
import { sha256 } from '../crypto/sha';
import { encodeSecp256k1Signature } from '../crypto/signature';
import { encode } from '../messages/registry';

export const getAccount = async (address: string) => {
    const accountRequest = await fetch(`https://sei-api.polkachu.com/cosmos/auth/v1beta1/accounts/${address}`)

    const { account } = await accountRequest.json()
    if(!account){
        throw new Error(
            `Account '${address}' does not exist on chain. Send some tokens there before.`,
          );
    }

    return {
        sequence: +get(account, 'sequence'),
        account_number: +get(account, 'account_number'),
        pub_key: get(account, 'pub_key.key')
    }
}

export const sendTokens = async (
    privateKey: string,
    senderAddress: string,
    receiptAddress: string,
    amount: any,
    fee: any,
    memo: string = ''
) => {
    const sendMsg = {
        typeUrl: "/cosmos.bank.v1beta1.MsgSend",
        value: {
          fromAddress: senderAddress,
          toAddress: receiptAddress,
          amount: [...amount],
        },
    }
    console.log("🚀 ~ sendMsg:", sendMsg)

    return signAndBroadcast(privateKey, senderAddress, [sendMsg], fee, memo)
}

function makeSignerInfos(
    signers: ReadonlyArray<{ readonly pubkey: Any; readonly sequence: number | bigint }>,
    signMode: SignMode,
  ): SignerInfo[] {
    return signers.map(
      ({ pubkey, sequence }): SignerInfo => ({
        publicKey: pubkey,
        modeInfo: {
          single: { mode: signMode },
        },
        sequence: BigInt(sequence),
      }),
    );
  }
  

export function makeAuthInfoBytes(
    signers: ReadonlyArray<{ readonly pubkey: Any; readonly sequence: bigint | number }>,
    feeAmount: readonly Coin[],
    gasLimit: number,
    feeGranter: string | undefined,
    feePayer: string | undefined,
    signMode = SignMode.SIGN_MODE_DIRECT,
  ): Uint8Array {
    console.log("🚀 ~ signers:", signers)

    const authInfo = AuthInfo.fromPartial({
      signerInfos: makeSignerInfos(signers, signMode),
      fee: {
        amount: [...feeAmount],
        gasLimit: BigInt(gasLimit),
        granter: feeGranter,
        payer: feePayer,
      },
    });
    return AuthInfo.encode(authInfo).finish();
  }

  export function makeSignDoc(
    bodyBytes: Uint8Array,
    authInfoBytes: Uint8Array,
    chainId: string,
    accountNumber: number,
  ): SignDoc {
    return {
      bodyBytes: bodyBytes,
      authInfoBytes: authInfoBytes,
      chainId: chainId,
      accountNumber: BigInt(accountNumber),
    };
  }

  export function makeSignBytes({ accountNumber, authInfoBytes, bodyBytes, chainId }: SignDoc): Uint8Array {
    const signDoc = SignDoc.fromPartial({
      accountNumber: accountNumber,
      authInfoBytes: authInfoBytes,
      bodyBytes: bodyBytes,
      chainId: chainId,
    });
    return SignDoc.encode(signDoc).finish();
  }

export const signAndBroadcast = async (
    privateKey: string,
    senderAddress: string,
    msgs: any,
    fee: any,
    memo: string = '',
    timeoutHeight?: bigint
) => {
    const { account_number, sequence } = await getAccount(senderAddress)
    console.log("🚀 ~ sequence:", sequence)
    console.log("🚀 ~ account_number:", account_number)
    const chainId = 'pacific-1'

    // const  signerData = {
    //     accountNumber: account_number,
    //     sequence: sequence,
    //     chainId: 'cosmoshub-4',
    // };

    const uncompressed =  (await makeKeypair(Buffer.from(privateKey, 'hex'))).pubkey
    const publickey = compressPubkey(uncompressed)
    console.log("🚀 ~ encodeSecp256k1Pubkey(publickey):", encodeSecp256k1Pubkey(publickey))
    const pubkey = encodePubkey(encodeSecp256k1Pubkey(publickey));
    console.log("🚀 ~ pubkey:", pubkey)

    const txBodyEncodeObject = {
        typeUrl: "/cosmos.tx.v1beta1.TxBody",
        value: {
          messages: msgs,
          memo: memo,
        },
    };
    console.log("🚀 ~ txBodyEncodeObject:", txBodyEncodeObject)

    const txBodyBytes = encode(txBodyEncodeObject);
    console.log("🚀 ~ txBodyBytes:", txBodyBytes)

    const gasLimit = Int53.fromString(fee.gas).toNumber();
    console.log("🚀 ~ gasLimit:", gasLimit)

    const authInfoBytes = makeAuthInfoBytes(
        [{ pubkey, sequence }],
        fee.amount,
        gasLimit,
        fee.granter,
        fee.payer,
    );
    console.log("🚀 ~ authInfoBytes:", authInfoBytes)

    const signDoc = makeSignDoc(txBodyBytes, authInfoBytes, chainId, account_number);
    console.log("🚀 ~ signDoc:", signDoc)

    const signBytes = makeSignBytes(signDoc);
    console.log("🚀 ~ signBytes:", signBytes)

    const hashedMessage = sha256(signBytes);
    console.log("🚀 ~ hashedMessage:", hashedMessage)
    const signature = await createSignature(hashedMessage, Buffer.from(privateKey, 'hex'));
    console.log("🚀 ~ signature:", signature)
    const signatureBytes = new Uint8Array([...signature.r(32), ...signature.s(32)]);
    console.log("🚀 ~ signatureBytes:", signatureBytes)
    const stdSignature = encodeSecp256k1Signature(publickey, signatureBytes);
    console.log("🚀 ~ stdSignature:", stdSignature)

    const txRaw = TxRaw.fromPartial({
      bodyBytes: signDoc.bodyBytes,
      authInfoBytes: signDoc.authInfoBytes,
      signatures: [fromBase64(stdSignature.signature)],
    });
    console.log("🚀 ~ txRaw:", txRaw)

    const txBytes = TxRaw.encode(txRaw).finish();
    console.log("🚀 ~ txBytes:", txBytes)

    console.log("🚀 ~ Buffer.from(txBytes).toString('hex'):", toBase64(txBytes))

    const broadcastTx = await fetch('https://sei-rpc.polkachu.com/',{
        method: 'POST',
        body: JSON.stringify({
            "jsonrpc": "2.0",
            "id": new Date().getTime(),
            "method": "broadcast_tx_sync",
            "params": {
               "tx": toBase64(txBytes)
            }
        })
    })
    // const broadcastTx = await fetch(`https://go.getblock.io/df1ba16c91be41b1a3847b8592e925f4/cosmos/tx/v1beta1/txs`,{
    //     method: 'POST',
    //     body: JSON.stringify({
    //         "tx_bytes": Buffer.from(txBytes).toString('hex'),
    //         "mode": "BROADCAST_MODE_UNSPECIFIED"
    //       })
    // })

    const data = await broadcastTx.json()
    console.log("🚀 ~ data:", data)

    return data?.result
}

// const sign = async (address: string, privateKey: string) => {
//     const { account_number, sequence, pub_key } = await getAccount(address)
//     const  signerData = {
//         accountNumber: account_number,
//         sequence: sequence,
//         chainId: 'cosmoshub-4',
//     };

//     const uncompressed =  (await makeKeypair(Buffer.from(privateKey, 'hex'))).pubkey
    
//     const publickey = compressPubkey(uncompressed)

//     const pubkey = encodePubkey(encodeSecp256k1Pubkey(publickey));

//     const data = {
//         "signerAddress": "cosmos1s9x5442jzz6xxfsdf2v7hmvasrxpx3d0euwwye",
//         "messages": {
//             "typeUrl": "/cosmos.bank.v1beta1.MsgSend",
//             "value": {
//                 "fromAddress": "cosmos1s9x5442jzz6xxfsdf2v7hmvasrxpx3d0euwwye",
//                 "toAddress": "cosmos1s9x5442jzz6xxfsdf2v7hmvasrxpx3d0euwwye",
//                 "amount": [
//                     "1",
//                     "0",
//                     "0",
//                     "0"
//                 ]
//             }
//         },
//         "fee": {
//             "gas": "130000",
//             "amount": [
//                 {
//                     "denom": "uatom",
//                     "amount": "3251"
//                 }
//             ]
//         },
//         "memo": "cosmos1s9x5442jzz6xxfsdf2v7hmvasrxpx3d0euwwye"
    
// }