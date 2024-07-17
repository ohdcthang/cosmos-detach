import { Any } from "cosmjs-types/google/protobuf/any";
import { BinaryWriter } from "cosmjs-types/binary";
import { TxBody } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import type protobuf from "protobufjs";

import { MsgMultiSend, MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx";

export const bankTypes: ReadonlyArray<[string, GeneratedType]> = [
  ["/cosmos.bank.v1beta1.MsgMultiSend", MsgMultiSend],
  ["/cosmos.bank.v1beta1.MsgSend", MsgSend],
];

const types =  new Map<string, GeneratedType>([...[...bankTypes]])

export interface EncodeObject {
    readonly typeUrl: string;
    readonly value: any;
}

export interface TxBodyEncodeObject extends EncodeObject {
    readonly typeUrl: "/cosmos.tx.v1beta1.TxBody";
    readonly value: TxBodyValue;
}

interface TxBodyValue {
    readonly messages: readonly EncodeObject[];
    readonly memo?: string;
    readonly timeoutHeight?: bigint;
    readonly extensionOptions?: Any[];
    readonly nonCriticalExtensionOptions?: Any[];
}

export interface TelescopeGeneratedType {
  /** This may or may not exist depending on the code generator settings. Don't rely on it. */
  readonly typeUrl?: string;
  readonly encode: (
    message:
      | any
      | {
          [k: string]: any;
        },
    writer?: BinaryWriter,
  ) => BinaryWriter;
  readonly decode: (input: Uint8Array, length?: number) => any;
  readonly fromPartial: (object: any) => any;
}

/**
 * A type generated by [ts-proto](https://github.com/stephenh/ts-proto).
 */
export interface TsProtoGeneratedType {
  readonly encode: (message: any | { [k: string]: any }, writer?: protobuf.Writer) => protobuf.Writer;
  readonly decode: (input: Uint8Array | protobuf.Reader, length?: number) => any;
  readonly fromPartial: (object: any) => any;
  // Methods from ts-proto types we don't need
  // readonly fromJSON: (object: any) => any;
  // readonly toJSON: (message: any | { [k: string]: any }) => unknown;
}

/**
 * A type generated by [protobufjs](https://github.com/protobufjs/protobuf.js).
 *
 * This can be used if you want to create types at runtime using pure JavaScript.
 * See https://gist.github.com/fadeev/a4981eff1cf3a805ef10e25313d5f2b7
 */
export interface PbjsGeneratedType {
  readonly create: (properties?: { [k: string]: any }) => any;
  readonly encode: (message: any | { [k: string]: any }, writer?: protobuf.Writer) => protobuf.Writer;
  readonly decode: (reader: protobuf.Reader | Uint8Array, length?: number) => any;
}

export type GeneratedType = TelescopeGeneratedType | TsProtoGeneratedType | PbjsGeneratedType;


export function isTelescopeGeneratedType(type: GeneratedType): type is TelescopeGeneratedType {
    const casted = type as TelescopeGeneratedType;
    return typeof casted.fromPartial === "function" && typeof casted.typeUrl == "string";
  }
  
  export function isTsProtoGeneratedType(type: GeneratedType): type is TsProtoGeneratedType {
    return typeof (type as TsProtoGeneratedType).fromPartial === "function";
  }
  

export function isTxBodyEncodeObject(encodeObject: EncodeObject): encodeObject is TxBodyEncodeObject {
    return (encodeObject as TxBodyEncodeObject).typeUrl === "/cosmos.tx.v1beta1.TxBody";
}

const lookupType = (typeUrl: string): GeneratedType | undefined => {
    console.log("🚀 ~ lookupType ~ typeUrl:", typeUrl)
    console.log("🚀 ~ lookupType ~ types.get(typeUrl):", types.get(typeUrl))
    return types.get(typeUrl);
  }

const lookupTypeWithError = (typeUrl: string): GeneratedType => {
    const type = lookupType(typeUrl);
    if (!type) {
      throw new Error(`Unregistered type url: ${typeUrl}`);
    }
    return type;
  }
const encodeTxBody = (txBodyFields: TxBodyValue): Uint8Array  =>{
    const wrappedMessages = txBodyFields.messages.map((message) => encodeAsAny(message));
    const txBody = TxBody.fromPartial({
      ...txBodyFields,
      timeoutHeight: BigInt(txBodyFields.timeoutHeight?.toString() ?? "0"),
      messages: wrappedMessages,
    });
    return TxBody.encode(txBody).finish();
}
  
export const encode = (encodeObject: EncodeObject): Uint8Array => {
    const { value, typeUrl } = encodeObject;
    if (isTxBodyEncodeObject(encodeObject)) {
      return encodeTxBody(value);
    }
    const type = lookupTypeWithError(typeUrl);
    const instance =
      isTelescopeGeneratedType(type) || isTsProtoGeneratedType(type)
        ? type.fromPartial(value)
        : type.create(value);
    return type.encode(instance).finish();
}

const encodeAsAny = (encodeObject: EncodeObject): Any => {
    const binaryValue = encode(encodeObject);
    return Any.fromPartial({
      typeUrl: encodeObject.typeUrl,
      value: binaryValue,
    });
  }