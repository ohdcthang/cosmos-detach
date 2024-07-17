import { bech32 } from "bech32";
import { mnemonicToSeed } from "bip39"
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { encodePubkey, encodeSecp256k1Pubkey, rawSecp256k1PubkeyToRawAddress } from "../amino/addresses";
import { fromBase64, toBase64 } from "../crypto/base64";
import { Int53 } from "../crypto/math";
import { compressPubkey, createSignature, makeKeypair } from "../crypto/secp256k1";
import { sha256 } from "../crypto/sha";
import { encodeSecp256k1Signature } from "../crypto/signature";
import { Slip10, Slip10Curve, stringToPath } from "../crypto/slip10";
import { encode } from "../messages/registry";
import { getAccount, makeAuthInfoBytes, makeSignBytes, makeSignDoc } from "../signing";

export class Cosmjsclass{
    constructor(){

    }

    async createAccount(mnemonicOrPriv: string, isPrivateKey: boolean){
        let privateKey: Buffer

        if(isPrivateKey){
            privateKey = Buffer.from(mnemonicOrPriv, 'hex')
        }else{
            const seed = await mnemonicToSeed(mnemonicOrPriv)

            const { privkey } = Slip10.derivePath(Slip10Curve.Secp256k1, seed, stringToPath("m/44'/118'/0'/0/0"));
            privateKey = privkey as Buffer
        }

        const uncompressed =  (await makeKeypair(privateKey)).pubkey
        console.log("🚀 ~ huhu ~ uncompressed:", uncompressed)
    
        const publickey = compressPubkey(uncompressed)


        const words = bech32.toWords(rawSecp256k1PubkeyToRawAddress(publickey))
        const address = bech32.encode('cosmos', words)

        return {
            address,
            privateKey: privateKey.toString('hex'),
            publickey: Buffer.from(publickey).toString('hex')
        }
    }

    async sendTokens(
      privateKey: string,
      senderAddress: string,
      receiptAddress: string,
      amount: any,
      fee: any,
      memo: string = '',
      isSignDirect: boolean = true,
      chainId: string
    ){
      const sendMsg = {
          typeUrl: "/cosmos.bank.v1beta1.MsgSend",
          value: {
            fromAddress: senderAddress,
            toAddress: receiptAddress,
            amount: [...amount],
          },
      }
      console.log("🚀 ~ sendMsg:", sendMsg)

      return this.signAndBroadcast(privateKey, senderAddress, [sendMsg], fee, memo, isSignDirect, chainId)
    }

    async signAndBroadcast(
      privateKey: string,
      senderAddress: string,
      msgs: any,
      fee: any,
      memo: string = '',
      isSignDirect: boolean = true,
      chainId: string
    ){

      const txRaw = await this.sign(privateKey, senderAddress, msgs, fee, memo, isSignDirect, chainId) as TxRaw;
      const txBytes = TxRaw.encode(txRaw).finish();

      return this.broadcastTransaction(toBase64(txBytes))
    }

    async sign(
      privateKey: string,
      senderAddress: string,
      msgs: any,
      fee: any,
      memo: string = '',
      isSignDirect: boolean = true,
      chainId: string
    ) {
      const { account_number, sequence } = await getAccount(senderAddress)

      const  signerData = {
        accountNumber: account_number,
        sequence: sequence,
        chainId: chainId,
      };

      return isSignDirect ? this.signDirect(privateKey, msgs, fee, memo, signerData) : undefined
    }

    async signDirect(
      privateKey: string,
      msgs: any,
      fee: any,
      memo: string = '',
      signerData:  { accountNumber: number, sequence: number, chainId: string }
    ){
      const { accountNumber, sequence, chainId } = signerData
      const uncompressed =  (await makeKeypair(Buffer.from(privateKey, 'hex'))).pubkey
      const publickey = compressPubkey(uncompressed)
      const pubkey = encodePubkey(encodeSecp256k1Pubkey(publickey));
  
      const txBodyEncodeObject = {
          typeUrl: "/cosmos.tx.v1beta1.TxBody",
          value: {
            messages: msgs,
            memo: memo,
          },
      };

      const txBodyBytes = encode(txBodyEncodeObject);
      const gasLimit = Int53.fromString(fee.gas).toNumber();

      const authInfoBytes = makeAuthInfoBytes(
        [{ pubkey, sequence }],
        fee.amount,
        gasLimit,
        fee.granter,
        fee.payer,
      );

      const signDoc = makeSignDoc(txBodyBytes, authInfoBytes, chainId, accountNumber);

      const signBytes = makeSignBytes(signDoc);
      const hashedMessage = sha256(signBytes);
      const signature = await createSignature(hashedMessage, Buffer.from(privateKey, 'hex'));
      //@ts-expect-error
      const signatureBytes = new Uint8Array([...signature.r(32), ...signature.s(32)]);
      const stdSignature = encodeSecp256k1Signature(publickey, signatureBytes);

      const txRaw = TxRaw.fromPartial({
        bodyBytes: signDoc.bodyBytes,
        authInfoBytes: signDoc.authInfoBytes,
        signatures: [fromBase64(stdSignature.signature)],
      });

      return txRaw
    }

    async broadcastTransaction(txBytes: string){
      const broadcastTx = await fetch('https://go.getblock.io/ffc5f2c4b42d4f92b1b4c0e212842a57',{
        method: 'POST',
        body: JSON.stringify({
            "jsonrpc": "2.0",
            "id": new Date().getTime(),
            "method": "broadcast_tx_sync",
            "params": {
               "tx": txBytes
            }
        })
      })

      const { result } = await broadcastTx.json()

      return result?.hash || ''
    }
}