/**
 * PKCS#12 (PFX) 생성기 — Korean SEED-CBC PBE 버전
 *
 * CODEF 의 서버 파서는 KISA SEED-CBC 로 암호화된 bag 만 처리한다 (네이티브 codefCert 앱이
 * OpenSSL + KISA 패치 조합으로 생성하는 형태).  node-forge/pkijs 의 3DES/AES PBE 출력은
 * CF-04025 로 거부된다.
 *
 * 이 모듈은 `pbeWithSHAAndSEED-CBC` (OID 1.2.410.200004.1.15) 로 cert bag / shrouded key
 * bag 을 암호화한 PKCS#12 를 수동 조립한다.
 *
 * 구조:
 *   PFX {
 *     version: 3,
 *     authSafe: ContentInfo(data, OCTET_STRING(AuthenticatedSafe)),
 *     macData: { mac, salt, iterations }
 *   }
 *   AuthenticatedSafe = SEQUENCE OF ContentInfo
 *     [0] ContentInfo(encryptedData, EncryptedData{ SEED-CBC(SafeContents[certBag]) })
 *     [1] ContentInfo(data, OCTET_STRING(SafeContents[pkcs8ShroudedKeyBag]))
 *
 * 키/IV 유도:
 *   PKCS#12 KDF B.3 (RFC 7292) — forge.pki.pbe.generatePkcs12Key 사용
 *     id=1 → encryption key (SEED 16 bytes)
 *     id=2 → IV (SEED block 16 bytes)
 *     id=3 → MAC key (SHA1 20 bytes)
 *
 * 암호화:
 *   SEED-CBC, PKCS#7 padding, `@kr-yeon/kisa-seed` 사용.
 */

import forge from "node-forge";
import { KISA_SEED_CBC } from "@kr-yeon/kisa-seed";

// OID constants
const OID_DATA = "1.2.840.113549.1.7.1";
const OID_ENCRYPTED_DATA = "1.2.840.113549.1.7.6";
const OID_CERT_BAG = "1.2.840.113549.1.12.10.1.3";
const OID_SHROUDED_KEY_BAG = "1.2.840.113549.1.12.10.1.2";
const OID_X509_CERT = "1.2.840.113549.1.9.22.1";
const OID_FRIENDLY_NAME = "1.2.840.113549.1.9.20";
const OID_LOCAL_KEY_ID = "1.2.840.113549.1.9.21";
const OID_PBE_SEED_CBC = "1.2.410.200004.1.15"; // pbeWithSHA1AndSEED-CBC (PBES1)
const OID_PBES2 = "1.2.840.113549.1.5.13";
const OID_PBKDF2 = "1.2.840.113549.1.5.12";
const OID_SEED_CBC_CIPHER = "1.2.410.200004.1.4"; // seed-cbc (standalone cipher OID)
const OID_HMAC_SHA1 = "1.2.840.113549.2.7";
const OID_SHA1 = "1.3.14.3.2.26";
const OID_PBE_SHA1_3DES = "1.2.840.113549.1.12.1.3"; // pbeWithSHAAnd3-KeyTripleDES-CBC
const OID_PBE_SHA1_RC2_40 = "1.2.840.113549.1.12.1.6"; // pbewithSHAAnd40BitRC2-CBC

const SEED_BLOCK_SIZE = 16;
const SEED_KEY_LEN = 16;
const MAC_KEY_LEN = 20;

export interface SeedPkcs12Options {
  iterations?: number;
  saltSize?: number;
  includeFriendlyName?: boolean;
  includeLocalKeyId?: boolean;
  friendlyName?: string;
  useMac?: boolean;
  /**
   * 어떤 KDF/PBE 구조로 bag 을 암호화할지.
   * - "openssl-default": OpenSSL PKCS12_create() 기본값과 **바이트-호환**.
   *                     Cert bag = PBE-SHA1-RC2-40 (OID 1.2.840.113549.1.12.1.6)
   *                     Key bag  = PBE-SHA1-3DES  (OID 1.2.840.113549.1.12.1.3)
   *                     PKCS#12 KDF B.3 (BMPString password).
   *                     CODEF 네이티브 앱이 사용하는 조합 (binary 역공학으로 확정).
   * - "pbkdf1": PBES1 (OID 1.2.410.200004.1.15) + PBKDF1-SHA1 + SEED-CBC
   * - "pkcs12": PBES1 (OID 1.2.410.200004.1.15) + PKCS#12 KDF B.3 + SEED-CBC
   * - "pbes2":  PBES2 + PBKDF2-HMAC-SHA1 + SEED-CBC
   */
  kdfMode?: "openssl-default" | "pbkdf1" | "pkcs12" | "pbes2";
}

// ────────────────── byte helpers ──────────────────

function binStrToBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

function bytesToBinStr(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  crypto.getRandomValues(out);
  return out;
}

function pkcs7Pad(data: Uint8Array, block: number): Uint8Array {
  const padLen = block - (data.length % block);
  const out = new Uint8Array(data.length + padLen);
  out.set(data, 0);
  for (let i = data.length; i < out.length; i++) out[i] = padLen;
  return out;
}

// ────────────────── PKCS#12 KDF (forge) ──────────────────
// forge.pki.pbe.generatePkcs12Key(password, salt, id, iter, n, md)
// salt/password → binary string. output: forge ByteBuffer (use .bytes() to get bin string).

function derivePkcs12(
  password: string,
  salt: Uint8Array,
  id: 1 | 2 | 3,
  iterations: number,
  nBytes: number,
): Uint8Array {
  const saltBuf = forge.util.createBuffer(bytesToBinStr(salt), "raw");
  const bb = (forge.pki as any).pbe.generatePkcs12Key(
    password,
    saltBuf,
    id,
    iterations,
    nBytes,
  );
  return binStrToBytes(bb.bytes());
}

// ────────────────── SEED-CBC encrypt ──────────────────

function seedCbcEncrypt(
  key: Uint8Array,
  iv: Uint8Array,
  plaintext: Uint8Array,
): Uint8Array {
  const padded = pkcs7Pad(plaintext, SEED_BLOCK_SIZE);
  const cipher = KISA_SEED_CBC.SEED_CBC_Encrypt(key, iv, padded, 0, padded.length);
  return cipher instanceof Uint8Array ? cipher : new Uint8Array(cipher);
}

// ────────────────── PBKDF1-SHA1 (KISA 표준 PBE-SHA1-SEED-CBC 용) ──────────────────

async function sha1Digest(bytes: Uint8Array): Promise<Uint8Array> {
  const ab = new ArrayBuffer(bytes.length);
  new Uint8Array(ab).set(bytes);
  const out = await crypto.subtle.digest("SHA-1", ab);
  return new Uint8Array(out);
}

/** Synchronous SHA1 using forge (for compute-localKeyId where async is inconvenient). */
function sha1DigestSync(bytes: Uint8Array): Uint8Array {
  const md = forge.md.sha1.create();
  md.update(bytesToBinStr(bytes));
  return binStrToBytes(md.digest().bytes());
}

/**
 * PBKDF1-SHA1 (RFC 2898 §5.1).
 *   T_1 = SHA1(P || S); T_i = SHA1(T_{i-1}); DK = T_iter[0..dkLen]
 */
async function pbkdf1Sha1(
  password: string,
  salt: Uint8Array,
  iterations: number,
  dkLen: number,
): Promise<Uint8Array> {
  const pw = new TextEncoder().encode(password);
  const concat = new Uint8Array(pw.length + salt.length);
  concat.set(pw, 0);
  concat.set(salt, pw.length);
  let t = await sha1Digest(concat);
  for (let i = 1; i < iterations; i++) t = await sha1Digest(t);
  return t.slice(0, dkLen);
}

/**
 * KISA PBE-SHA1-SEED-CBC key/IV 유도 (signPri.key 복호화와 동일 방식):
 *   dk = PBKDF1-SHA1(pw, salt, iter, 20)
 *   key = dk[0..16]
 *   iv  = SHA1(dk[16..20])[0..16]
 */
async function deriveSeedKeyIvPbkdf1(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<{ key: Uint8Array; iv: Uint8Array }> {
  const dk = await pbkdf1Sha1(password, salt, iterations, 20);
  const key = dk.slice(0, 16);
  const ivHash = await sha1Digest(dk.slice(16, 20));
  const iv = ivHash.slice(0, 16);
  return { key, iv };
}

async function pbkdf2HmacSha1(
  password: string,
  salt: Uint8Array,
  iterations: number,
  dkLen: number,
): Promise<Uint8Array> {
  const pwBytes = new TextEncoder().encode(password);
  const ab = new ArrayBuffer(pwBytes.length);
  new Uint8Array(ab).set(pwBytes);
  const baseKey = await crypto.subtle.importKey("raw", ab, "PBKDF2", false, ["deriveBits"]);
  const saltAb = new ArrayBuffer(salt.length);
  new Uint8Array(saltAb).set(salt);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltAb, iterations, hash: "SHA-1" },
    baseKey,
    dkLen * 8,
  );
  return new Uint8Array(bits);
}

interface SeedPbeResult {
  cipher: Uint8Array;
  /** IV needed when emitting PBES2 (random IV, not derived from password). */
  iv?: Uint8Array;
}

// ────────────────── forge primitives for OpenSSL-default mode ──────────────────

function forge3desCbcEncrypt(key: Uint8Array, iv: Uint8Array, plaintext: Uint8Array): Uint8Array {
  const cipher = (forge.des as any).createEncryptionCipher(bytesToBinStr(key));
  cipher.start(bytesToBinStr(iv));
  cipher.update(forge.util.createBuffer(bytesToBinStr(plaintext), "raw"));
  if (!cipher.finish()) throw new Error("3DES 암호화 실패");
  return binStrToBytes(cipher.output.getBytes());
}

function forgeRc2_40CbcEncrypt(key: Uint8Array, iv: Uint8Array, plaintext: Uint8Array): Uint8Array {
  const cipher = (forge.rc2 as any).createEncryptionCipher(bytesToBinStr(key), 40);
  cipher.start(bytesToBinStr(iv), null);
  cipher.update(forge.util.createBuffer(bytesToBinStr(plaintext), "raw"));
  if (!cipher.finish()) throw new Error("RC2-40 암호화 실패");
  return binStrToBytes(cipher.output.getBytes());
}

/**
 * OpenSSL PKCS#12 default PBE — encrypts `plaintext` using PKCS#12 KDF B.3
 * (BMPString password via forge.pki.pbe.generatePkcs12Key) + specified cipher.
 */
function opensslPkcs12Pbe(
  password: string,
  salt: Uint8Array,
  iterations: number,
  plaintext: Uint8Array,
  cipher: "3des" | "rc2-40",
): Uint8Array {
  // forge's CBC cipher adds PKCS#5 padding automatically on finish().
  const keyLen = cipher === "3des" ? 24 : 5;
  const ivLen = 8;
  const key = derivePkcs12(password, salt, 1, iterations, keyLen);
  const iv = derivePkcs12(password, salt, 2, iterations, ivLen);
  if (cipher === "3des") return forge3desCbcEncrypt(key, iv, plaintext);
  return forgeRc2_40CbcEncrypt(key, iv, plaintext);
}

async function seedPbeEncrypt(
  password: string,
  salt: Uint8Array,
  iterations: number,
  plaintext: Uint8Array,
  kdfMode: "openssl-default" | "pbkdf1" | "pkcs12" | "pbes2",
  bagKind?: "cert" | "key",
): Promise<SeedPbeResult> {
  let key: Uint8Array;
  let iv: Uint8Array;
  if (kdfMode === "openssl-default") {
    const cipher = bagKind === "cert" ? "rc2-40" : "3des";
    return { cipher: opensslPkcs12Pbe(password, salt, iterations, plaintext, cipher) };
  }
  if (kdfMode === "pbkdf1") {
    const derived = await deriveSeedKeyIvPbkdf1(password, salt, iterations);
    key = derived.key;
    iv = derived.iv;
    return { cipher: seedCbcEncrypt(key, iv, plaintext) };
  } else if (kdfMode === "pbes2") {
    // PBES2: PBKDF2-HMAC-SHA1 → 16 byte SEED key; IV is random (encoded explicitly in algId)
    key = await pbkdf2HmacSha1(password, salt, iterations, SEED_KEY_LEN);
    iv = randomBytes(SEED_BLOCK_SIZE);
    return { cipher: seedCbcEncrypt(key, iv, plaintext), iv };
  } else {
    key = derivePkcs12(password, salt, 1, iterations, SEED_KEY_LEN);
    iv = derivePkcs12(password, salt, 2, iterations, SEED_BLOCK_SIZE);
    return { cipher: seedCbcEncrypt(key, iv, plaintext) };
  }
}

// ────────────────── ASN.1 builders ──────────────────

const { asn1 } = forge;

function asn1Seq(children: forge.asn1.Asn1[]): forge.asn1.Asn1 {
  return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, children);
}

function asn1Set(children: forge.asn1.Asn1[]): forge.asn1.Asn1 {
  return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, children);
}

function asn1Oid(oid: string): forge.asn1.Asn1 {
  return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false, asn1.oidToDer(oid).getBytes());
}

function asn1OctetString(bytes: Uint8Array): forge.asn1.Asn1 {
  return asn1.create(
    asn1.Class.UNIVERSAL,
    asn1.Type.OCTETSTRING,
    false,
    bytesToBinStr(bytes),
  );
}

function asn1Integer(value: number): forge.asn1.Asn1 {
  return asn1.create(
    asn1.Class.UNIVERSAL,
    asn1.Type.INTEGER,
    false,
    asn1.integerToDer(value).getBytes(),
  );
}

function asn1Null(): forge.asn1.Asn1 {
  return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, "");
}

function asn1Utf8(str: string): forge.asn1.Asn1 {
  return asn1.create(
    asn1.Class.UNIVERSAL,
    asn1.Type.UTF8,
    false,
    forge.util.encodeUtf8(str),
  );
}

function asn1BmpString(str: string): forge.asn1.Asn1 {
  let encoded = "";
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    encoded += String.fromCharCode((code >> 8) & 0xff) + String.fromCharCode(code & 0xff);
  }
  return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BMPSTRING, false, encoded);
}

// [0] EXPLICIT wrapper
function asn1ContextExplicit(tag: number, inner: forge.asn1.Asn1): forge.asn1.Asn1 {
  return asn1.create(asn1.Class.CONTEXT_SPECIFIC, tag, true, [inner]);
}

// [0] IMPLICIT OCTET STRING
function asn1ContextImplicitOctets(tag: number, bytes: Uint8Array): forge.asn1.Asn1 {
  return asn1.create(asn1.Class.CONTEXT_SPECIFIC, tag, false, bytesToBinStr(bytes));
}

// ────────────────── Bag builders ──────────────────

/**
 * PBES1: AlgorithmIdentifier { pbeWithSHAAndSEED-CBC, PBEParameter { salt, iter } }
 */
function pbes1AlgorithmIdentifier(salt: Uint8Array, iterations: number): forge.asn1.Asn1 {
  return asn1Seq([
    asn1Oid(OID_PBE_SEED_CBC),
    asn1Seq([asn1OctetString(salt), asn1Integer(iterations)]),
  ]);
}

/**
 * PBES2 AlgorithmIdentifier:
 *   AlgorithmIdentifier {
 *     algorithm = pbes2,
 *     parameters = SEQUENCE {
 *       keyDerivationFunc { pbkdf2, params { salt, iter, prf=HmacSHA1 } },
 *       encryptionScheme  { seed-cbc, OCTET STRING iv }
 *     }
 *   }
 */
function pbes2AlgorithmIdentifier(
  salt: Uint8Array,
  iterations: number,
  iv: Uint8Array,
): forge.asn1.Asn1 {
  const pbkdf2Params = asn1Seq([
    asn1OctetString(salt),
    asn1Integer(iterations),
    // prf = HmacWithSHA1 (explicit — some parsers require it)
    asn1Seq([asn1Oid(OID_HMAC_SHA1), asn1Null()]),
  ]);
  const kdf = asn1Seq([asn1Oid(OID_PBKDF2), pbkdf2Params]);
  const encScheme = asn1Seq([asn1Oid(OID_SEED_CBC_CIPHER), asn1OctetString(iv)]);
  return asn1Seq([asn1Oid(OID_PBES2), asn1Seq([kdf, encScheme])]);
}

/** OpenSSL PKCS#12 default: per-bag PBE with standard OIDs. */
function opensslPbeAlgorithmIdentifier(
  bagKind: "cert" | "key",
  salt: Uint8Array,
  iterations: number,
): forge.asn1.Asn1 {
  const oid = bagKind === "cert" ? OID_PBE_SHA1_RC2_40 : OID_PBE_SHA1_3DES;
  return asn1Seq([
    asn1Oid(oid),
    asn1Seq([asn1OctetString(salt), asn1Integer(iterations)]),
  ]);
}

function pbeAlgorithmIdentifier(
  kdfMode: "openssl-default" | "pbkdf1" | "pkcs12" | "pbes2",
  salt: Uint8Array,
  iterations: number,
  iv?: Uint8Array,
  bagKind?: "cert" | "key",
): forge.asn1.Asn1 {
  if (kdfMode === "openssl-default") {
    if (!bagKind) throw new Error("openssl-default PBE requires bagKind");
    return opensslPbeAlgorithmIdentifier(bagKind, salt, iterations);
  }
  if (kdfMode === "pbes2") {
    if (!iv) throw new Error("PBES2 requires explicit IV");
    return pbes2AlgorithmIdentifier(salt, iterations, iv);
  }
  return pbes1AlgorithmIdentifier(salt, iterations);
}

/**
 * CertBag ::= SEQUENCE { certId OID, certValue [0] EXPLICIT ANY }
 * For X.509: certValue = OCTET STRING wrapping cert DER.
 */
function certBag(certDer: Uint8Array): forge.asn1.Asn1 {
  return asn1Seq([
    asn1Oid(OID_X509_CERT),
    asn1ContextExplicit(0, asn1OctetString(certDer)),
  ]);
}

function bagAttributes(
  options: { friendlyName?: string; localKeyId?: Uint8Array },
): forge.asn1.Asn1 | null {
  const attrs: forge.asn1.Asn1[] = [];
  if (options.friendlyName) {
    attrs.push(
      asn1Seq([
        asn1Oid(OID_FRIENDLY_NAME),
        asn1Set([asn1BmpString(options.friendlyName)]),
      ]),
    );
  }
  if (options.localKeyId) {
    attrs.push(
      asn1Seq([
        asn1Oid(OID_LOCAL_KEY_ID),
        asn1Set([asn1OctetString(options.localKeyId)]),
      ]),
    );
  }
  return attrs.length > 0 ? asn1Set(attrs) : null;
}

/**
 * SafeBag ::= SEQUENCE {
 *   bagId OID,
 *   bagValue [0] EXPLICIT ANY,
 *   bagAttributes SET OF Attribute OPTIONAL
 * }
 */
function safeBag(
  bagIdOid: string,
  bagValue: forge.asn1.Asn1,
  attrs: forge.asn1.Asn1 | null,
): forge.asn1.Asn1 {
  const children: forge.asn1.Asn1[] = [
    asn1Oid(bagIdOid),
    asn1ContextExplicit(0, bagValue),
  ];
  if (attrs) children.push(attrs);
  return asn1Seq(children);
}

// ────────────────── Top-level builder ──────────────────

export interface BuildSeedPkcs12Params {
  cert: forge.pki.Certificate;
  privateKey: forge.pki.rsa.PrivateKey;
  password: string;
  options?: SeedPkcs12Options;
}

export async function buildSeedCbcPkcs12({
  cert,
  privateKey,
  password,
  options = {},
}: BuildSeedPkcs12Params): Promise<Uint8Array> {
  const iterations = options.iterations ?? 2048;
  const saltSize = options.saltSize ?? 8;
  const includeFriendlyName = options.includeFriendlyName ?? true;
  const includeLocalKeyId = options.includeLocalKeyId ?? true;
  // CODEF 네이티브 앱이 PKCS12_create 에 넘기는 friendlyName = "pkcs12test" (binary 리터럴 풀 확인).
  const friendlyName = options.friendlyName ?? "pkcs12test";
  const useMac = options.useMac ?? true;
  const kdfMode = options.kdfMode ?? "pbkdf1";

  const certDerForKeyId = binStrToBytes(asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes());
  // OpenSSL PKCS12_create 는 localKeyId 로 SHA1(cert DER) 을 씀 (X509_digest).
  const localKeyIdBytes = includeLocalKeyId ? sha1DigestSync(certDerForKeyId) : undefined;

  // ── 1. Cert SafeContents (SEQUENCE OF SafeBag) ──
  const certBagAttrs = bagAttributes({
    friendlyName: includeFriendlyName ? friendlyName : undefined,
    localKeyId: localKeyIdBytes,
  });
  const certSafeBag = safeBag(OID_CERT_BAG, certBag(
    binStrToBytes(asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()),
  ), certBagAttrs);
  const certSafeContents = asn1Seq([certSafeBag]);
  const certSafeContentsDer = binStrToBytes(asn1.toDer(certSafeContents).getBytes());

  // Encrypt cert SafeContents with SEED-CBC PBE
  const certSalt = randomBytes(saltSize);
  const certResult = await seedPbeEncrypt(password, certSalt, iterations, certSafeContentsDer, kdfMode, "cert");

  /* EncryptedData ::= SEQUENCE {
       version INTEGER {v0(0)},
       encryptedContentInfo SEQUENCE {
         contentType OID,
         contentEncryptionAlgorithm SEQUENCE,
         encryptedContent [0] IMPLICIT OCTET STRING
       }
     } */
  const certEncryptedData = asn1Seq([
    asn1Integer(0),
    asn1Seq([
      asn1Oid(OID_DATA),
      pbeAlgorithmIdentifier(kdfMode, certSalt, iterations, certResult.iv, "cert"),
      asn1ContextImplicitOctets(0, certResult.cipher),
    ]),
  ]);

  // ContentInfo wrapping EncryptedData
  const certContentInfo = asn1Seq([
    asn1Oid(OID_ENCRYPTED_DATA),
    asn1ContextExplicit(0, certEncryptedData),
  ]);

  // ── 2. Key SafeContents (SEQUENCE OF SafeBag with shrouded key bag) ──
  const keyPkcs8Der = binStrToBytes(
    asn1.toDer(
      (forge.pki as any).wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(privateKey)),
    ).getBytes(),
  );
  const keySalt = randomBytes(saltSize);
  const keyResult = await seedPbeEncrypt(password, keySalt, iterations, keyPkcs8Der, kdfMode, "key");

  /* EncryptedPrivateKeyInfo ::= SEQUENCE {
       encryptionAlgorithm AlgorithmIdentifier,
       encryptedData OCTET STRING
     } */
  const encryptedPrivateKeyInfo = asn1Seq([
    pbeAlgorithmIdentifier(kdfMode, keySalt, iterations, keyResult.iv, "key"),
    asn1OctetString(keyResult.cipher),
  ]);

  const keyBagAttrs = bagAttributes({
    friendlyName: includeFriendlyName ? friendlyName : undefined,
    localKeyId: localKeyIdBytes,
  });
  const keySafeBag = safeBag(OID_SHROUDED_KEY_BAG, encryptedPrivateKeyInfo, keyBagAttrs);
  const keySafeContents = asn1Seq([keySafeBag]);
  const keySafeContentsDer = binStrToBytes(asn1.toDer(keySafeContents).getBytes());

  // ContentInfo wrapping Data(SafeContents)
  const keyContentInfo = asn1Seq([
    asn1Oid(OID_DATA),
    asn1ContextExplicit(0, asn1OctetString(keySafeContentsDer)),
  ]);

  // ── 3. AuthenticatedSafe ──
  const authenticatedSafe = asn1Seq([certContentInfo, keyContentInfo]);
  const authSafeDer = binStrToBytes(asn1.toDer(authenticatedSafe).getBytes());

  // ── 4. authSafe ContentInfo(data, OCTET STRING(authSafeDer)) ──
  const authSafeContentInfo = asn1Seq([
    asn1Oid(OID_DATA),
    asn1ContextExplicit(0, asn1OctetString(authSafeDer)),
  ]);

  // ── 5. MacData (optional) ──
  const pfxChildren: forge.asn1.Asn1[] = [asn1Integer(3), authSafeContentInfo];

  if (useMac) {
    const macSalt = randomBytes(saltSize);
    // OpenSSL PKCS12_create 기본 mac_iter = 1 (bag iterations 와 분리).
    const macIter = kdfMode === "openssl-default" ? 1 : iterations;
    const macKey = derivePkcs12(password, macSalt, 3, macIter, MAC_KEY_LEN);

    const hmac = forge.hmac.create();
    hmac.start("sha1", bytesToBinStr(macKey));
    hmac.update(bytesToBinStr(authSafeDer));
    const macBytes = binStrToBytes(hmac.digest().bytes());

    /* DigestInfo ::= SEQUENCE {
         digestAlgorithm AlgorithmIdentifier,
         digest OCTET STRING
       }
       MacData ::= SEQUENCE { mac DigestInfo, macSalt OCTET STRING, iterations INTEGER DEFAULT 1 }
       DER 규칙: DEFAULT 값(1)은 반드시 생략. CODEF 공식 파서가 strict DER 준수. */
    const macDataChildren: forge.asn1.Asn1[] = [
      asn1Seq([
        asn1Seq([asn1Oid(OID_SHA1), asn1Null()]),
        asn1OctetString(macBytes),
      ]),
      asn1OctetString(macSalt),
    ];
    if (macIter !== 1) {
      macDataChildren.push(asn1Integer(macIter));
    }
    pfxChildren.push(asn1Seq(macDataChildren));
  }

  const pfx = asn1Seq(pfxChildren);
  return binStrToBytes(asn1.toDer(pfx).getBytes());
}

/**
 * 재파싱 검증 — 생성된 PFX 가 최소한 ASN.1 구조로 다시 읽히는지 확인.
 * (CODEF 는 SEED-CBC 파서를 쓰므로 node-forge 로 완전 복호화는 불가능.
 * 구조 sanity check 만 한다.)
 */
export function verifySeedCbcPkcs12Structure(pfxBytes: Uint8Array): {
  ok: boolean;
  contentInfoCount?: number;
  note?: string;
} {
  try {
    const pfxAsn1 = asn1.fromDer(bytesToBinStr(pfxBytes), false);
    const pfxValue = pfxAsn1.value as forge.asn1.Asn1[];
    if (!Array.isArray(pfxValue) || pfxValue.length < 2) {
      return { ok: false, note: "PFX 최상위 SEQUENCE 불완전" };
    }
    const authSafeCI = pfxValue[1].value as forge.asn1.Asn1[];
    const authSafeOctet = (authSafeCI[1].value as forge.asn1.Asn1[])[0];
    const authSafeBytes = authSafeOctet.value as string;
    const authSafeAsn1 = asn1.fromDer(authSafeBytes, false);
    const contentInfos = authSafeAsn1.value as forge.asn1.Asn1[];
    return {
      ok: Array.isArray(contentInfos) && contentInfos.length >= 2,
      contentInfoCount: contentInfos.length,
    };
  } catch (e) {
    return { ok: false, note: e instanceof Error ? e.message : String(e) };
  }
}
