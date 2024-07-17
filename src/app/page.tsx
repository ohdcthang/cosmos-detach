'use client'

import { bech32 } from "bech32";
import { mnemonicToSeed } from "bip39";
import { rawSecp256k1PubkeyToRawAddress } from "./amino/addresses";
import { compressPubkey, makeKeypair } from "./crypto/secp256k1";
import { Slip10, Slip10Curve, stringToPath } from "./crypto/slip10";
import { sendTokens, signAndBroadcast } from "./signing";

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

    const data = await sendTokens(
      '84174d395ab1653f41904454a2885f61196cb624c6cc1dafccfc93bdeb99f05b',
      'cosmos1s9x5442jzz6xxfsdf2v7hmvasrxpx3d0euwwye',
      'cosmos1s9x5442jzz6xxfsdf2v7hmvasrxpx3d0euwwye',
      [{
        "amount": "1000",
        "denom": "uatom"
      }],
      {
        "gas": "130000",
        "amount": [
            {
                "denom": "uatom",
                "amount": "3251"
            }
        ]
      }
    )

    console.log("🚀 ~ huhu ~ data:", data)

  }

  huhu()


  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      Victoria xao quyet
    </main>
  );
}