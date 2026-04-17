/**
 * 한국 공동인증서(NPKI) signCert.der + signPri.key → PFX(.p12) base64 변환
 *
 * - signPri.key는 KISA SEED-CBC(OID 1.2.410.200004.1.4 또는 .1.15)로 암호화된 PKCS#8.
 * - node-forge는 SEED를 모르므로, 브라우저에서 직접 PBKDF1(SHA1)로 키/IV 유도 후
 *   `@kr-yeon/kisa-seed`의 SEED_CBC_Decrypt로 평문 PKCS#1 RSA 키를 복원한다.
 * - 복원된 RSA 키 + DER 인증서를 forge로 PKCS#12에 묶어 base64로 반환.
 *
 * 참고 알고리즘: PyPinkSign (bandoche/PyPinkSign) — KISA K-PKI 표준.
 */

import forge from "node-forge";
import { KISA_SEED_CBC } from "@kr-yeon/kisa-seed";

const OID_SEED_CBC = "1.2.410.200004.1.4";
const OID_SEED_CBC_WITH_SHA1 = "1.2.410.200004.1.15";

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/[\r\n\s]/g, ""));
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

async function sha1(bytes: Uint8Array): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest("SHA-1", bytes);
  return new Uint8Array(buf);
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

/**
 * 한국 공동인증서(NPKI) signPri.key의 PKCS#8 EncryptedPrivateKeyInfo를 SEED-CBC로 복호화.
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

  // algorithm OID
  const oidBytes = algId[0].value as string;
  const oid = forge.asn1.derToOid(oidBytes);

  if (oid !== OID_SEED_CBC && oid !== OID_SEED_CBC_WITH_SHA1) {
    throw new Error(
      `지원하지 않는 인증서 암호화 OID: ${oid}. 한국 공동인증서(SEED-CBC)만 지원해요.`,
    );
  }

  // parameters SEQUENCE { salt OCTET STRING, iterationCount INTEGER }
  const params = algId[1].value as forge.asn1.Asn1[];
  const saltStr = params[0].value as string;
  const salt = new Uint8Array(saltStr.length);
  for (let i = 0; i < saltStr.length; i++) salt[i] = saltStr.charCodeAt(i);

  const iterStr = params[1].value as string;
  // forge: INTEGER → bytes(big-endian, signed)
  let iter = 0;
  for (let i = 0; i < iterStr.length; i++) {
    iter = (iter << 8) | (iterStr.charCodeAt(i) & 0xff);
  }
  if (!iter || iter < 1) {
    throw new Error("인증서 반복 횟수(iteration count)를 읽지 못했습니다.");
  }

  const cipherStr = encOctet.value as string;
  const cipherBytes = new Uint8Array(cipherStr.length);
  for (let i = 0; i < cipherStr.length; i++) {
    cipherBytes[i] = cipherStr.charCodeAt(i);
  }

  const { key, iv } = await deriveSeedKeyIv(password, salt, iter);

  // SEED-CBC 복호화
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

  // 2) 개인키 복호화 (SEED-CBC → 평문 RSA key DER)
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

  // 4) PFX(PKCS#12)로 묶기. CODEF가 인식할 수 있도록 동일 비밀번호로 보호.
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
    privateKey as forge.pki.rsa.PrivateKey,
    [cert],
    password,
    { algorithm: "3des", friendlyName: "hometax-cert" },
  );
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  return forge.util.encode64(p12Der);
}
