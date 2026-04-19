/**
 * 한국 공동인증서(NPKI) signCert.der + signPri.key → PFX(.p12) base64 변환
 *
 * - signPri.key는 KISA SEED-CBC(OID 1.2.410.200004.1.4 또는 .1.15) 또는
 *   PBES2(OID 1.2.840.113549.1.5.13)로 암호화된 PKCS#8일 수 있다.
 * - node-forge는 표준 PBES2(AES/3DES)는 처리하지만, 한국 인증서의
 *   PBES2 + SEED-CBC 조합은 내부 encryptionScheme OID를 몰라 복호화에 실패한다.
 * - 따라서 브라우저에서 직접 PBKDF1/PBKDF2로 키를 유도하고
 *   `@kr-yeon/kisa-seed`의 SEED_CBC_Decrypt로 평문 개인키를 복원한다.
 * - 복원된 RSA 키 + DER 인증서를 forge로 PKCS#12에 묶어 base64로 반환.
 *
 * 참고 알고리즘: PyPinkSign (bandoche/PyPinkSign) — KISA K-PKI 표준.
 */

import forge from "node-forge";
import { KISA_SEED_CBC } from "@kr-yeon/kisa-seed";

const OID_SEED_CBC = "1.2.410.200004.1.4";
const OID_SEED_CBC_WITH_SHA1 = "1.2.410.200004.1.15";
const OID_PBES2 = "1.2.840.113549.1.5.13";
const OID_PKCS5_PBKDF2 = "1.2.840.113549.1.5.12";
const OID_PBE_SHA1_3DES = "1.2.840.113549.1.12.1.3";
const OID_PBE_SHA1_3DES_40 = "1.2.840.113549.1.12.1.6";
const OID_HMAC_SHA1 = "1.2.840.113549.2.7";
const OID_HMAC_SHA224 = "1.2.840.113549.2.8";
const OID_HMAC_SHA256 = "1.2.840.113549.2.9";
const OID_HMAC_SHA384 = "1.2.840.113549.2.10";
const OID_HMAC_SHA512 = "1.2.840.113549.2.11";

type WebCryptoHash = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/[\r\n\s]/g, ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function binaryStringToBytes(bin: string): Uint8Array {
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBinaryString(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function readAsn1Integer(node: forge.asn1.Asn1): number {
  const value = node.value as string;
  let out = 0;
  for (let i = 0; i < value.length; i++) {
    out = (out << 8) | (value.charCodeAt(i) & 0xff);
  }
  return out;
}

function readAsn1Oid(node: forge.asn1.Asn1): string {
  return forge.asn1.derToOid(node.value as string);
}

function getWebCryptoHashFromPrfOid(oid?: string): WebCryptoHash {
  switch (oid || OID_HMAC_SHA1) {
    case OID_HMAC_SHA1:
      return "SHA-1";
    case OID_HMAC_SHA256:
      return "SHA-256";
    case OID_HMAC_SHA384:
      return "SHA-384";
    case OID_HMAC_SHA512:
      return "SHA-512";
    case OID_HMAC_SHA224:
      throw new Error("PBES2 PRF SHA-224는 브라우저 WebCrypto에서 지원하지 않아요.");
    default:
      throw new Error(`지원하지 않는 PBES2 PRF OID: ${oid}`);
  }
}

async function sha1(bytes: Uint8Array): Promise<Uint8Array> {
  // Copy into a fresh ArrayBuffer to satisfy SubtleCrypto's strict BufferSource typing.
  const ab = new ArrayBuffer(bytes.length);
  new Uint8Array(ab).set(bytes);
  const buf = await crypto.subtle.digest("SHA-1", ab);
  return new Uint8Array(buf);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(bytes.length);
  new Uint8Array(ab).set(bytes);
  return ab;
}

async function pbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number,
  dkLen: number,
  hash: WebCryptoHash,
): Promise<Uint8Array> {
  const passwordBytes = new TextEncoder().encode(password);
  const baseKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(passwordBytes),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations,
      hash,
    },
    baseKey,
    dkLen * 8,
  );
  return new Uint8Array(derivedBits);
}

/**
 * PBKDF1 (RFC 2898 §5.1) with SHA-1, dkLen=20.
 * T_1 = SHA1(P || S); T_i = SHA1(T_{i-1}); DK = T_iterCount[0..dkLen]
 */
async function pbkdf1Sha1(
  password: string,
  salt: Uint8Array,
  iterations: number,
  dkLen = 20,
): Promise<Uint8Array> {
  // password → UTF-8 bytes
  const pwBytes = new TextEncoder().encode(password);
  let t = await sha1(concatBytes(pwBytes, salt));
  for (let i = 1; i < iterations; i++) {
    t = await sha1(t);
  }
  return t.slice(0, dkLen);
}

/**
 * KISA seedCBC(WithSHA1) PBES1 파라미터:
 *   AlgorithmIdentifier ::= SEQUENCE { algorithm OID, parameters SEQUENCE { salt OCTET STRING, iterationCount INTEGER } }
 * 복호화 키 유도:
 *   dk = PBKDF1(pw, salt, iter, 20)
 *   key = dk[0..16]
 *   iv  = SHA1(dk[16..20])[0..16]
 */
async function deriveSeedKeyIv(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<{ key: Uint8Array; iv: Uint8Array }> {
  const dk = await pbkdf1Sha1(password, salt, iterations, 20);
  const key = dk.slice(0, 16);
  const ivSeedHash = await sha1(dk.slice(16, 20));
  const iv = ivSeedHash.slice(0, 16);
  return { key, iv };
}

function decryptSeedCipher(
  key: Uint8Array,
  iv: Uint8Array,
  cipherBytes: Uint8Array,
): Uint8Array {
  const plain = KISA_SEED_CBC.SEED_CBC_Decrypt(
    key,
    iv,
    cipherBytes,
    0,
    cipherBytes.length,
  );

  if (!plain || plain.length === 0) {
    throw new Error("SEED-CBC 복호화 결과가 비어있어요. 비밀번호를 확인해주세요.");
  }

  return plain instanceof Uint8Array ? plain : new Uint8Array(plain);
}

function decryptWithForgePrivateKeyInfo(
  asn1: forge.asn1.Asn1,
  password: string,
): Uint8Array {
  const decryptedInfo = forge.pki.decryptPrivateKeyInfo(asn1, password);
  if (!decryptedInfo) {
    throw new Error("비밀번호가 일치하지 않아요.");
  }

  const der = forge.asn1.toDer(decryptedInfo).getBytes();
  const out = new Uint8Array(der.length);
  for (let i = 0; i < der.length; i++) out[i] = der.charCodeAt(i);
  return out;
}

/**
 * 한국 공동인증서(NPKI) signPri.key의 PKCS#8 EncryptedPrivateKeyInfo를 복호화.
 * 반환: 평문 PKCS#1 RSAPrivateKey DER bytes 또는 PKCS#8 PrivateKeyInfo DER bytes (forge에서 모두 인식 가능).
 */
async function decryptKoreanPkcs8(
  encryptedKeyDer: Uint8Array,
  password: string,
): Promise<Uint8Array> {
  // ASN.1 파싱
  const binary = bytesToBinaryString(encryptedKeyDer);
  const asn1 = forge.asn1.fromDer(binary, false);

  // EncryptedPrivateKeyInfo ::= SEQUENCE {
  //   encryptionAlgorithm AlgorithmIdentifier,
  //   encryptedData OCTET STRING
  // }
  const top = asn1.value as forge.asn1.Asn1[];
  if (!top || top.length < 2) {
    throw new Error("올바른 PKCS#8 EncryptedPrivateKeyInfo 형식이 아닙니다.");
  }
  const algId = top[0].value as forge.asn1.Asn1[];
  const encOctet = top[1];
  const cipherBytes = binaryStringToBytes(encOctet.value as string);

  // algorithm OID
  const oid = readAsn1Oid(algId[0]);

  // ── 분기 1: PBES2. 표준 AES/3DES는 forge, 한국형 PBES2+SEED-CBC는 수동 복호화.
  if (oid === OID_PBES2) {
    try {
      const params = algId[1].value as forge.asn1.Asn1[];
      const kdfSeq = params[0].value as forge.asn1.Asn1[];
      const encSchemeSeq = params[1].value as forge.asn1.Asn1[];
      const kdfOid = readAsn1Oid(kdfSeq[0]);
      const encSchemeOid = readAsn1Oid(encSchemeSeq[0]);

      const isKoreanSeedScheme =
        encSchemeOid === OID_SEED_CBC || encSchemeOid === OID_SEED_CBC_WITH_SHA1;

      if (kdfOid === OID_PKCS5_PBKDF2 && isKoreanSeedScheme) {
        const kdfParams = kdfSeq[1].value as forge.asn1.Asn1[];
        const salt = binaryStringToBytes(kdfParams[0].value as string);
        const iterations = readAsn1Integer(kdfParams[1]);

        let keyLength = 16;
        let prfOid = OID_HMAC_SHA1;

        if (kdfParams[2]) {
          const third = kdfParams[2];
          if (Array.isArray(third.value)) {
            prfOid = readAsn1Oid((third.value as forge.asn1.Asn1[])[0]);
          } else {
            keyLength = readAsn1Integer(third);
          }
        }

        if (kdfParams[3]) {
          prfOid = readAsn1Oid((kdfParams[3].value as forge.asn1.Asn1[])[0]);
        }

        const iv = binaryStringToBytes(encSchemeSeq[1].value as string);
        const hash = getWebCryptoHashFromPrfOid(prfOid);
        const key = await pbkdf2(password, salt, iterations, keyLength, hash);
        return decryptSeedCipher(key, iv, cipherBytes);
      }

      return decryptWithForgePrivateKeyInfo(asn1, password);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`표준(PBES2) 인증서 복호화 실패: ${msg}. 비밀번호를 확인해주세요.`);
    }
  }

  // ── 분기 2: PKCS#12 PBE / 표준 PBES1 — node-forge가 직접 지원
  if (
    oid === OID_PBE_SHA1_3DES ||
    oid === OID_PBE_SHA1_3DES_40 ||
    oid.startsWith("1.2.840.113549.1.5.") ||
    oid.startsWith("1.2.840.113549.1.12.1.")
  ) {
    try {
      return decryptWithForgePrivateKeyInfo(asn1, password);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`표준 인증서 복호화 실패: ${msg}. 비밀번호를 확인해주세요.`);
    }
  }

  // ── 분기 3: KISA SEED-CBC (한국 공동인증서 전용 PBES1)
  if (oid !== OID_SEED_CBC && oid !== OID_SEED_CBC_WITH_SHA1) {
    throw new Error(
      `지원하지 않는 인증서 암호화 OID: ${oid}. 한국 공동인증서(SEED-CBC) 또는 PBES2만 지원해요.`,
    );
  }

  // parameters SEQUENCE { salt OCTET STRING, iterationCount INTEGER }
  const params = algId[1].value as forge.asn1.Asn1[];
  const salt = binaryStringToBytes(params[0].value as string);
  const iter = readAsn1Integer(params[1]);
  if (!iter || iter < 1) {
    throw new Error("인증서 반복 횟수(iteration count)를 읽지 못했습니다.");
  }

  const { key, iv } = await deriveSeedKeyIv(password, salt, iter);
  return decryptSeedCipher(key, iv, cipherBytes);
}

/**
 * DER 인증서 + 한국 공동인증서 KEY 파일을 받아 PFX(.p12) base64를 반환한다.
 *
 * @param certDerBase64  signCert.der base64
 * @param keyDerBase64   signPri.key base64 (SEED-CBC encrypted PKCS#8)
 * @param password       인증서 비밀번호
 */
export async function buildPfxFromKoreanDerKey(
  certDerBase64: string,
  keyDerBase64: string,
  password: string,
): Promise<string> {
  if (!certDerBase64 || !keyDerBase64 || !password) {
    throw new Error("인증서/키/비밀번호가 모두 필요합니다.");
  }

  // 1) 인증서 파싱
  const certBytes = base64ToBytes(certDerBase64);
  const cert = forge.pki.certificateFromAsn1(
    forge.asn1.fromDer(bytesToBinaryString(certBytes), false),
  );

  // 2) 개인키 복호화 (SEED-CBC / PBES2 → 평문 RSA key DER)
  const encryptedKeyBytes = base64ToBytes(keyDerBase64);
  const plainKeyDer = await decryptKoreanPkcs8(encryptedKeyBytes, password);

  // 3) 평문 키 → forge privateKey 객체
  // 한국 공동인증서 복호화 결과는 보통 PKCS#1 RSAPrivateKey 또는 PKCS#8 PrivateKeyInfo.
  let privateKey: forge.pki.PrivateKey | null = null;
  const keyAsn1 = forge.asn1.fromDer(bytesToBinaryString(plainKeyDer), false);
  try {
    // PKCS#8 PrivateKeyInfo 시도
    privateKey = forge.pki.privateKeyFromAsn1(keyAsn1);
  } catch (_e) {
    privateKey = null;
  }
  if (!privateKey) {
    throw new Error("복호화된 개인키를 해석하지 못했어요. 비밀번호가 다를 수 있어요.");
  }

  // 4) PFX(PKCS#12)로 묶기.
  // CODEF 호환성을 위해 bag attribute(friendlyName/localKeyId)를 최소화한
  // legacy 3DES PKCS#12로 내보내고, 같은 비밀번호로 즉시 재파싱 검증까지 수행한다.
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
    privateKey as forge.pki.rsa.PrivateKey,
    cert,
    password,
    {
      algorithm: "3des",
      useMac: true,
      generateLocalKeyId: false,
    },
  );
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();

  try {
    forge.pkcs12.pkcs12FromAsn1(
      forge.asn1.fromDer(p12Der, false),
      false,
      password,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`생성된 PFX 검증에 실패했어요: ${message}`);
  }

  return forge.util.encode64(p12Der);
}
