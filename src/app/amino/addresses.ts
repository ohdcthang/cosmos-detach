import { fromBase64, toBase64 } from "../crypto/base64";
import { ripemd160 } from "../crypto/ripemd";
import { sha256 } from "../crypto/sha";
import { Any } from "cosmjs-types/google/protobuf/any";
import { Uint53 } from "../crypto/math";
import { PubKey as CosmosCryptoEd25519Pubkey } from "cosmjs-types/cosmos/crypto/ed25519/keys";
import { LegacyAminoPubKey } from "cosmjs-types/cosmos/crypto/multisig/keys";
import { PubKey as CosmosCryptoSecp256k1Pubkey } from "cosmjs-types/cosmos/crypto/secp256k1/keys";

export interface Pubkey {
  // type is one of the strings defined in pubkeyType
  // I don't use a string literal union here as that makes trouble with json test data:
  // https://github.com/cosmos/cosmjs/pull/44#pullrequestreview-353280504
  readonly type: string;
  readonly value: any;
}


export interface SinglePubkey extends Pubkey {
  // type is one of the strings defined in pubkeyType
  // I don't use a string literal union here as that makes trouble with json test data:
  // https://github.com/cosmos/cosmjs/pull/44#pullrequestreview-353280504
  readonly type: string;
  /**
   * The base64 encoding of the Amino binary encoded pubkey.
   *
   * Note: if type is Secp256k1, this must contain a 33 bytes compressed pubkey.
   */
  readonly value: string;
}

export interface Secp256k1Pubkey extends SinglePubkey {
  readonly type: "tendermint/PubKeySecp256k1";
  readonly value: string;
}

export const pubkeyType = {
  /** @see https://github.com/tendermint/tendermint/blob/v0.33.0/crypto/ed25519/ed25519.go#L22 */
  secp256k1: "tendermint/PubKeySecp256k1" as const,
  /** @see https://github.com/tendermint/tendermint/blob/v0.33.0/crypto/secp256k1/secp256k1.go#L23 */
  ed25519: "tendermint/PubKeyEd25519" as const,
  /** @see https://github.com/tendermint/tendermint/blob/v0.33.0/crypto/sr25519/codec.go#L12 */
  sr25519: "tendermint/PubKeySr25519" as const,
  multisigThreshold: "tendermint/PubKeyMultisigThreshold" as const,
};


export function rawSecp256k1PubkeyToRawAddress(pubkeyData: Uint8Array): Uint8Array {
    if (pubkeyData.length !== 33) {
      throw new Error(`Invalid Secp256k1 pubkey length (compressed): ${pubkeyData.length}`);
    }
    return ripemd160(sha256(pubkeyData));
}

export function encodeSecp256k1Pubkey(pubkey: Uint8Array): Secp256k1Pubkey {
  if (pubkey.length !== 33 || (pubkey[0] !== 0x02 && pubkey[0] !== 0x03)) {
    throw new Error("Public key must be compressed secp256k1, i.e. 33 bytes starting with 0x02 or 0x03");
  }
  return {
    type: pubkeyType.secp256k1,
    value: toBase64(pubkey),
  };
}


export interface Ed25519Pubkey extends SinglePubkey {
  readonly type: "tendermint/PubKeyEd25519";
  readonly value: string;
}

export function isEd25519Pubkey(pubkey: Pubkey): pubkey is Ed25519Pubkey {
  return (pubkey as Ed25519Pubkey).type === "tendermint/PubKeyEd25519";
}

export interface Secp256k1Pubkey extends SinglePubkey {
  readonly type: "tendermint/PubKeySecp256k1";
  readonly value: string;
}

export function isSecp256k1Pubkey(pubkey: Pubkey): pubkey is Secp256k1Pubkey {
  return (pubkey as Secp256k1Pubkey).type === "tendermint/PubKeySecp256k1";
}

export interface MultisigThresholdPubkey extends Pubkey {
  readonly type: "tendermint/PubKeyMultisigThreshold";
  readonly value: {
    /** A string-encoded integer */
    readonly threshold: string;
    readonly pubkeys: readonly SinglePubkey[];
  };
}

export function isMultisigThresholdPubkey(pubkey: Pubkey): pubkey is MultisigThresholdPubkey {
  return (pubkey as MultisigThresholdPubkey).type === "tendermint/PubKeyMultisigThreshold";
}



export function encodePubkey(pubkey: Pubkey): Any {
  if (isSecp256k1Pubkey(pubkey)) {
    const pubkeyProto = CosmosCryptoSecp256k1Pubkey.fromPartial({
      key: fromBase64(pubkey.value),
    });
    return Any.fromPartial({
      typeUrl: "/cosmos.crypto.secp256k1.PubKey",
      value: Uint8Array.from(CosmosCryptoSecp256k1Pubkey.encode(pubkeyProto).finish()),
    });
  } else if (isEd25519Pubkey(pubkey)) {
    const pubkeyProto = CosmosCryptoEd25519Pubkey.fromPartial({
      key: fromBase64(pubkey.value),
    });
    return Any.fromPartial({
      typeUrl: "/cosmos.crypto.ed25519.PubKey",
      value: Uint8Array.from(CosmosCryptoEd25519Pubkey.encode(pubkeyProto).finish()),
    });
  } else if (isMultisigThresholdPubkey(pubkey)) {
    const pubkeyProto = LegacyAminoPubKey.fromPartial({
      threshold: Uint53.fromString(pubkey.value.threshold).toNumber(),
      publicKeys: pubkey.value.pubkeys.map(encodePubkey),
    });
    return Any.fromPartial({
      typeUrl: "/cosmos.crypto.multisig.LegacyAminoPubKey",
      value: Uint8Array.from(LegacyAminoPubKey.encode(pubkeyProto).finish()),
    });
  } else {
    throw new Error(`Pubkey type ${pubkey.type} not recognized`);
  }
}