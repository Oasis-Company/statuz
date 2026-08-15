use crate::cluster::Cluster;
use crate::graph::types::ClusterId;
use serde::Serialize;

// ─── Storage Format ──────────────────────────────────────────

/// The Statuz storage format — raw binary layout.
///
/// Version 0x0001 (backward compatible):
/// ```text
/// [magic: 4 bytes]   "STZ\0" (0x53 0x54 0x5A 0x00)
/// [version: 2 bytes] u16 LE, current = 0x0002
/// [flags: 2 bytes]   u16 LE, bit 0 = encrypted, bit 1 = compressed
/// --- only for v0x0002+ ---
/// [salt: 16 bytes]    argon2 salt (random when encrypted, zeros when not)
/// ---
/// [content: var]     msgpack-encoded Cluster (opt. compressed + encrypted)
/// [hash: 32 bytes]   blake3 hash of content (NOT the full file)
/// ```
///
/// The hash covers only the content portion, so magic/version/flags/salt
/// can be modified without invalidating the hash.
pub const MAGIC_BYTES: [u8; 4] = [0x53, 0x54, 0x5A, 0x00]; // "STZ\0"
pub const CURRENT_VERSION: u16 = 0x0002;
pub const MIN_SUPPORTED_VERSION: u16 = 0x0001;

/// Storage flags
pub const FLAG_NONE: u16 = 0x0000;
pub const FLAG_ENCRYPTED: u16 = 0x0001;
pub const FLAG_COMPRESSED: u16 = 0x0002;

/// Minimal header size: magic(4) + version(2) + flags(2) = 8 bytes
const HEADER_SIZE: usize = 8;
/// Salt size for argon2 key derivation (16 bytes = recommended minimum)
const SALT_SIZE: usize = 16;
/// Minimum file size: header(8) + salt(16) + hash(32) = 56 bytes (v0x0002)
const MIN_FILE_SIZE_V2: usize = HEADER_SIZE + SALT_SIZE + 32;
/// Minimum file size: header(8) + hash(32) = 40 bytes (v0x0001)
const MIN_FILE_SIZE_V1: usize = HEADER_SIZE + 32;

// ─── Error Type ──────────────────────────────────────────────

#[derive(Debug)]
pub enum StorageError {
    InvalidMagic([u8; 4]),
    UnsupportedVersion(u16),
    Corrupted(String),
    HashMismatch,
    EncodeError(String),
    DecodeError(String),
    CryptoError(String),
    IoError(std::io::Error),
}

impl std::fmt::Display for StorageError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            StorageError::InvalidMagic(magic) => {
                write!(
                    f,
                    "invalid magic bytes: expected {:02X?}, got {:02X?}",
                    MAGIC_BYTES, magic
                )
            }
            StorageError::UnsupportedVersion(v) => {
                write!(
                    f,
                    "unsupported version 0x{:04X} (supported: 0x{:04X}..=0x{:04X})",
                    v, MIN_SUPPORTED_VERSION, CURRENT_VERSION
                )
            }
            StorageError::Corrupted(msg) => write!(f, "corrupted file: {}", msg),
            StorageError::HashMismatch => write!(f, "content hash mismatch: data may be corrupted"),
            StorageError::EncodeError(msg) => write!(f, "encode error: {}", msg),
            StorageError::DecodeError(msg) => write!(f, "decode error: {}", msg),
            StorageError::CryptoError(msg) => write!(f, "crypto error: {}", msg),
            StorageError::IoError(err) => write!(f, "I/O error: {}", err),
        }
    }
}

impl std::error::Error for StorageError {}

impl From<std::io::Error> for StorageError {
    fn from(e: std::io::Error) -> Self {
        StorageError::IoError(e)
    }
}

// ─── Compression Helpers ─────────────────────────────────────

fn compress_content(data: &[u8]) -> Result<Vec<u8>, StorageError> {
    zstd::encode_all(data, 3) // level 3 = fast + decent ratio
        .map_err(|e| StorageError::EncodeError(format!("compression failed: {}", e)))
}

fn decompress_content(data: &[u8]) -> Result<Vec<u8>, StorageError> {
    zstd::decode_all(data)
        .map_err(|e| StorageError::DecodeError(format!("decompression failed: {}", e)))
}

// ─── Encryption Helpers ──────────────────────────────────────

use chacha20::cipher::{KeyIvInit, StreamCipher};
use chacha20::ChaCha20;

/// Derive a 32-byte encryption key from password + salt using argon2.
fn derive_key(password: &str, salt: &[u8]) -> Result<[u8; 32], StorageError> {
    use argon2::Algorithm;
    use argon2::Params;
    use argon2::Version;

    let params = Params::new(
        16 * 1024, // 16 KB memory cost (lightweight for CLI)
        2,         // 2 iterations
        1,         // 1 degree of parallelism
        Some(32),  // 32-byte output
    )
    .map_err(|e| StorageError::CryptoError(format!("argon2 params: {}", e)))?;

    let context = argon2::Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut key = [0u8; 32];
    context
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|e| StorageError::CryptoError(format!("key derivation: {}", e)))?;
    Ok(key)
}

/// Encrypt content using ChaCha20 (RFC 8439).
/// The nonce is the first 12 bytes of the salt (deterministic from salt).
fn encrypt_content(content: &[u8], password: &str, salt: &[u8]) -> Result<Vec<u8>, StorageError> {
    let key = derive_key(password, salt)?;
    // Nonce: first 12 bytes of salt (no need for separate nonce storage)
    let nonce = chacha20::Nonce::from_slice(&salt[..12]);
    let mut cipher = ChaCha20::new((&key).into(), nonce);
    let mut result = content.to_vec();
    cipher.apply_keystream(&mut result);
    Ok(result)
}

/// Decrypt content using ChaCha20 (RFC 8439).
fn decrypt_content(content: &[u8], password: &str, salt: &[u8]) -> Result<Vec<u8>, StorageError> {
    // Same operation as encryption (XOR is symmetric)
    encrypt_content(content, password, salt)
}

// ─── Serializer ──────────────────────────────────────────────

/// Serialize a Cluster into the Statuz storage format.
///
/// Supports optional zstd compression and chacha20 encryption.
/// When encrypted, the password is used to derive an argon2 key.
/// When not encrypted, a random salt is still written (for format consistency).
pub fn serialize_cluster(cluster: &Cluster) -> Result<Vec<u8>, StorageError> {
    serialize_cluster_with_options(cluster, false, None)
}

/// Serialize with optional compression and encryption.
pub fn serialize_cluster_with_options(
    cluster: &Cluster,
    compress: bool,
    password: Option<&str>,
) -> Result<Vec<u8>, StorageError> {
    // Step 1: msgpack encode.
    // Struct-as-map (field-name-keyed) so `skip_serializing_if` optional fields
    // round-trip safely — array (positional) mode breaks when fields are skipped.
    let mut buf = Vec::new();
    {
        let mut serializer = rmp_serde::Serializer::new(&mut buf).with_struct_map();
        cluster
            .serialize(&mut serializer)
            .map_err(|e| StorageError::EncodeError(e.to_string()))?;
    }
    let mut content = buf;

    // Step 2: optional compression
    let mut flags = FLAG_NONE;
    if compress {
        content = compress_content(&content)?;
        flags |= FLAG_COMPRESSED;
    }

    // Step 3: optional encryption
    let salt = if let Some(pwd) = password {
        let mut s = [0u8; SALT_SIZE];
        use rand::RngCore;
        rand::rngs::OsRng.fill_bytes(&mut s);
        flags |= FLAG_ENCRYPTED;
        content = encrypt_content(&content, pwd, &s)?;
        s
    } else {
        [0u8; SALT_SIZE] // zero salt when not encrypted
    };

    // Step 4: hash the final content
    let hash = blake3::hash(&content);

    // Step 5: write binary
    let mut buf = Vec::with_capacity(HEADER_SIZE + SALT_SIZE + content.len() + 32);
    buf.extend_from_slice(&MAGIC_BYTES); // 4 bytes
    buf.extend_from_slice(&CURRENT_VERSION.to_le_bytes()); // 2 bytes
    buf.extend_from_slice(&flags.to_le_bytes()); // 2 bytes
    buf.extend_from_slice(&salt); // 16 bytes
    buf.extend_from_slice(&content); // variable
    buf.extend_from_slice(hash.as_bytes()); // 32 bytes

    Ok(buf)
}

/// Deserialize a Cluster from the Statuz storage format.
///
/// Validates magic bytes, version range, and blake3 hash integrity.
/// Auto-detects compression and encryption from flags.
/// When encrypted, the password is required for decryption.
pub fn deserialize_cluster(data: &[u8]) -> Result<Cluster, StorageError> {
    deserialize_cluster_with_password(data, None)
}

/// Deserialize with optional password for encrypted files.
pub fn deserialize_cluster_with_password(
    data: &[u8],
    password: Option<&str>,
) -> Result<Cluster, StorageError> {
    let (_version, flags, content_start, min_size) = parse_header(data)?;

    // Extract content and hash
    let hash_start = data.len() - 32;
    let content = &data[content_start..hash_start];
    let stored_hash: [u8; 32] = data[hash_start..].try_into().unwrap();

    // Check minimum size
    if data.len() < min_size {
        return Err(StorageError::Corrupted(format!(
            "file too short: {} bytes (minimum {})",
            data.len(),
            min_size
        )));
    }

    // Verify hash integrity (before any decryption/decompression)
    let computed = blake3::hash(content);
    if computed.as_bytes() != &stored_hash {
        return Err(StorageError::HashMismatch);
    }

    let mut decoded_content = content.to_vec();

    // Decrypt (if encrypted) — encryption wraps the (possibly compressed) content,
    // so decryption MUST happen before decompression.
    if flags & FLAG_ENCRYPTED != 0 {
        let salt = &data[HEADER_SIZE..HEADER_SIZE + SALT_SIZE];
        let pwd = password.ok_or_else(|| {
            StorageError::CryptoError("file is encrypted but no password provided".into())
        })?;
        decoded_content = decrypt_content(&decoded_content, pwd, salt)?;
    }

    // Decompress (if compressed)
    if flags & FLAG_COMPRESSED != 0 {
        decoded_content = decompress_content(&decoded_content)?;
    }

    // Decode cluster from msgpack.
    // The decoder auto-detects array/map representation; the serializer writes
    // struct-as-map so skipped optional fields round-trip safely.
    let mut cluster: Cluster = rmp_serde::from_slice(&decoded_content)
        .map_err(|e| StorageError::DecodeError(e.to_string()))?;

    // Rebuild derived in-memory indexes (field degree indexes + cross-field
    // inverted index) so loaded clusters query at full speed (D1').
    cluster.rebuild_indexes();

    Ok(cluster)
}

// ─── Header Parsing ──────────────────────────────────────────

/// Parse and validate the file header. Returns (version, flags, content_start, min_size).
fn parse_header(data: &[u8]) -> Result<(u16, u16, usize, usize), StorageError> {
    if data.len() < HEADER_SIZE {
        return Err(StorageError::Corrupted(format!(
            "file too short: {} bytes (minimum {} for header)",
            data.len(),
            HEADER_SIZE
        )));
    }

    // Read magic bytes
    let magic: [u8; 4] = data[0..4].try_into().unwrap();
    if magic != MAGIC_BYTES {
        return Err(StorageError::InvalidMagic(magic));
    }

    // Read version
    let version = u16::from_le_bytes(data[4..6].try_into().unwrap());
    if !(MIN_SUPPORTED_VERSION..=CURRENT_VERSION).contains(&version) {
        return Err(StorageError::UnsupportedVersion(version));
    }

    // Read flags
    let flags = u16::from_le_bytes(data[6..8].try_into().unwrap());

    // Determine content start (v0x0001: no salt, v0x0002+: has salt)
    let (content_start, min_size) = if version >= 0x0002 {
        (HEADER_SIZE + SALT_SIZE, MIN_FILE_SIZE_V2)
    } else {
        (HEADER_SIZE, MIN_FILE_SIZE_V1)
    };

    Ok((version, flags, content_start, min_size))
}

// ─── Lightweight Verification ───────────────────────────────

/// Verify .stz file integrity without full deserialization.
///
/// Checks:
/// 1. Magic bytes match "STZ\0"
/// 2. Version is in supported range
/// 3. File size >= minimum (header + optional salt + hash)
/// 4. blake3 hash of content matches stored hash
pub fn verify_stz_file(data: &[u8]) -> Result<(), StorageError> {
    let (_version, _flags, content_start, min_size) = parse_header(data)?;

    if data.len() < min_size {
        return Err(StorageError::Corrupted(format!(
            "file too short: {} bytes (minimum {})",
            data.len(),
            min_size
        )));
    }

    let hash_start = data.len() - 32;
    let content = &data[content_start..hash_start];
    let stored_hash: [u8; 32] = data[hash_start..].try_into().unwrap();

    let computed = blake3::hash(content);
    if computed.as_bytes() != &stored_hash {
        return Err(StorageError::HashMismatch);
    }

    Ok(())
}

// ─── JSON Export ─────────────────────────────────────────────

/// Export a Cluster to human-readable JSON for debugging.
pub fn export_cluster_json(cluster: &Cluster) -> Result<String, StorageError> {
    serde_json::to_string_pretty(cluster).map_err(|e| StorageError::EncodeError(e.to_string()))
}

/// Export a Cluster to compact JSON (smaller, no whitespace).
pub fn export_cluster_json_compact(cluster: &Cluster) -> Result<String, StorageError> {
    serde_json::to_string(cluster).map_err(|e| StorageError::EncodeError(e.to_string()))
}

// ─── Hash ID Generation ─────────────────────────────────────

/// Generate a content-addressable Cluster ID from the cluster data.
/// The ID is the first 16 bytes of the blake3 hash, hex-encoded.
pub fn generate_cluster_id(cluster: &Cluster) -> ClusterId {
    let content = serde_json::to_vec(cluster).unwrap_or_default();
    let hash = blake3::hash(&content);
    hex::encode(&hash.as_bytes()[..16])
}

/// Verify a password against the cluster's stored hash.
/// Password is optional — if the cluster has no password_hash, it's unlocked.
pub fn verify_password(cluster: &Cluster, password: &str) -> bool {
    use argon2::password_hash::PasswordVerifier;
    match &cluster.password_hash {
        None => true,
        Some(hash) => {
            let parsed = match argon2::PasswordHash::new(hash) {
                Ok(p) => p,
                Err(_) => return false,
            };
            argon2::Argon2::default()
                .verify_password(password.as_bytes(), &parsed)
                .is_ok()
        }
    }
}

/// Hash a password using argon2.
pub fn hash_password(password: &str) -> Result<String, String> {
    use argon2::password_hash::SaltString;
    use argon2::PasswordHasher;

    let salt = SaltString::generate(&mut rand::rngs::OsRng);
    let hash = argon2::Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| format!("password hash error: {}", e))?;
    Ok(hash.to_string())
}

// ─── Tests ──────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::cluster::cluster::{Cluster, Visibility};
    use crate::graph::types::*;

    /// Create a minimal cluster for storage round-trip testing.
    fn make_test_cluster() -> Cluster {
        let mut c = Cluster::new("test-id".into(), "Storage Test".into(), Visibility::Public);
        c.register_node(Node {
            id: "n1".into(),
            type_: "test".into(),
            label: "Node 1".into(),
            status: NodeStatus::Active,
            meta: None,
        });
        c.create_field("f1".into(), "Field 1".into(), None);
        c
    }

    /// Create a large cluster with 1000 nodes for stress testing.
    fn make_large_cluster() -> Cluster {
        let mut c = Cluster::new("large-id".into(), "Large".into(), Visibility::Private);
        for i in 0..1000 {
            c.register_node(Node {
                id: format!("n{}", i),
                type_: "test".into(),
                label: format!("Node {}", i),
                status: NodeStatus::Active,
                meta: None,
            });
        }
        c
    }

    // ─── Round-trip: Empty Cluster ───────────────────────

    #[test]
    fn test_roundtrip_empty_cluster() {
        let c = Cluster::new("empty".into(), "Empty".into(), Visibility::Public);
        let data = serialize_cluster(&c).unwrap();
        let restored = deserialize_cluster(&data).unwrap();
        assert_eq!(restored.id, c.id, "ID should survive round-trip");
        assert_eq!(restored.name, c.name, "name should survive round-trip");
        assert_eq!(restored.nodes.len(), 0, "empty cluster has no nodes");
        assert_eq!(restored.fields.len(), 0, "empty cluster has no fields");
    }

    // ─── Round-trip: Large Cluster ───────────────────────

    #[test]
    fn test_roundtrip_large_cluster() {
        let c = make_large_cluster();
        let data = serialize_cluster(&c).unwrap();
        let restored = deserialize_cluster(&data).unwrap();
        assert_eq!(restored.nodes.len(), 1000, "all 1000 nodes should survive");
        assert!(restored.get_node("n0").is_some(), "first node should exist");
        assert!(
            restored.get_node("n999").is_some(),
            "last node should exist"
        );
    }

    // ─── Truncated Data ──────────────────────────────────

    #[test]
    fn test_truncated_data() {
        let c = make_test_cluster();
        let data = serialize_cluster(&c).unwrap();
        // Truncate by removing the last 10 bytes (part of the hash)
        let truncated = &data[..data.len() - 10];
        let result = deserialize_cluster(truncated);
        assert!(
            result.is_err(),
            "truncated data should fail deserialization"
        );
        match result {
            Err(StorageError::Corrupted(_)) | Err(StorageError::HashMismatch) => { /* expected */ }
            Err(e) => panic!("expected Corrupted or HashMismatch, got: {:?}", e),
            Ok(_) => panic!("expected error, got Ok"),
        }
    }

    // ─── Version Mismatch ────────────────────────────────

    #[test]
    fn test_version_mismatch() {
        let c = make_test_cluster();
        let mut data = serialize_cluster(&c).unwrap();
        // Corrupt the version bytes (offset 4-5) to an unsupported value
        data[4] = 0xFF;
        data[5] = 0xFF;
        let result = deserialize_cluster(&data);
        assert!(result.is_err(), "wrong version should fail deserialization");
        match result {
            Err(StorageError::UnsupportedVersion(v)) => {
                assert_eq!(v, 0xFFFF, "should report the corrupted version");
            }
            Err(e) => panic!("expected UnsupportedVersion, got: {:?}", e),
            Ok(_) => panic!("expected error, got Ok"),
        }
    }

    // ─── Password-Protected Cluster ──────────────────────

    #[test]
    fn test_password_protected_roundtrip() {
        let mut c = make_test_cluster();
        c.set_password("secret123").unwrap();
        let data = serialize_cluster(&c).unwrap();
        let restored = deserialize_cluster(&data).unwrap();
        assert!(
            restored.password_hash.is_some(),
            "password hash should survive round-trip"
        );
        assert!(restored.unlock("secret123"), "correct password should work");
        assert!(!restored.unlock("wrong"), "wrong password should fail");
    }

    // ─── JSON Export ─────────────────────────────────────

    #[test]
    fn test_json_export_format() {
        let c = make_test_cluster();
        let json = export_cluster_json(&c).unwrap();
        assert!(
            json.contains("Storage Test"),
            "JSON should contain cluster name"
        );
        assert!(json.contains("n1"), "JSON should contain node id");
        assert!(json.contains('\n'), "pretty JSON should have newlines");
        let compact = export_cluster_json_compact(&c).unwrap();
        assert!(
            compact.len() < json.len(),
            "compact JSON should be smaller than pretty"
        );
        assert!(
            !compact.contains('\n'),
            "compact JSON should not have newlines"
        );
    }

    // ─── Verify STZ File ─────────────────────────────────

    #[test]
    fn test_verify_stz_file_valid() {
        let c = make_test_cluster();
        let data = serialize_cluster(&c).unwrap();
        assert!(
            verify_stz_file(&data).is_ok(),
            "valid file should pass verification"
        );
    }

    #[test]
    fn test_verify_stz_file_corrupted() {
        let c = make_test_cluster();
        let mut data = serialize_cluster(&c).unwrap();
        // Corrupt a byte in the content section
        data[28] ^= 0xFF; // offset 28 = after header(8) + salt(16) = content start
        let result = verify_stz_file(&data);
        assert!(result.is_err(), "corrupted data should fail verification");
        match result {
            Err(StorageError::HashMismatch) => { /* expected */ }
            Err(e) => panic!("expected HashMismatch, got: {:?}", e),
            Ok(_) => panic!("expected error, got Ok"),
        }
    }

    // ─── Wrong Password Verification ─────────────────────

    #[test]
    fn test_wrong_password_verification() {
        let mut c = make_test_cluster();
        c.set_password("correct").unwrap();
        assert!(!c.unlock("wrong"), "wrong password should return false");
        assert!(c.unlock("correct"), "correct password should return true");
    }

    // ─── Compression Round-trip ──────────────────────────

    #[test]
    fn test_compression_roundtrip() {
        let c = make_large_cluster();
        let data = serialize_cluster_with_options(&c, true, None).unwrap();
        let restored = deserialize_cluster(&data).unwrap();
        assert_eq!(
            restored.nodes.len(),
            1000,
            "compressed round-trip should preserve nodes"
        );

        // Verify content section is smaller than raw (for large cluster)
        // Header(8) + salt(16) + content + hash(32)
        let raw = serialize_cluster(&c).unwrap();
        assert!(
            data.len() < raw.len(),
            "compressed file should be smaller than raw"
        );
    }

    // ─── Encryption Round-trip ───────────────────────────

    #[test]
    fn test_encryption_roundtrip() {
        let c = make_test_cluster();
        let data = serialize_cluster_with_options(&c, false, Some("p@ssw0rd!")).unwrap();
        let restored = deserialize_cluster_with_password(&data, Some("p@ssw0rd!")).unwrap();
        assert_eq!(
            restored.name, c.name,
            "encrypted round-trip should preserve name"
        );
        assert_eq!(
            restored.nodes.len(),
            c.nodes.len(),
            "encrypted round-trip should preserve nodes"
        );
    }

    // ─── Encryption Wrong Password ───────────────────────

    #[test]
    fn test_encryption_wrong_password() {
        let c = make_test_cluster();
        let data = serialize_cluster_with_options(&c, false, Some("real-password")).unwrap();
        let result = deserialize_cluster_with_password(&data, Some("wrong-password"));
        assert!(result.is_err(), "wrong password should fail decryption");
    }

    // ─── Encryption No Password ──────────────────────────

    #[test]
    fn test_encryption_no_password() {
        let c = make_test_cluster();
        let data = serialize_cluster_with_options(&c, false, Some("secret")).unwrap();
        let result = deserialize_cluster_with_password(&data, None);
        assert!(result.is_err(), "missing password should fail");
        match result {
            Err(StorageError::CryptoError(_)) => { /* expected */ }
            Err(e) => panic!("expected CryptoError, got: {:?}", e),
            Ok(_) => panic!("expected error, got Ok"),
        }
    }

    // ─── Compression + Encryption Combined ───────────────

    #[test]
    fn test_compress_and_encrypt() {
        let c = make_large_cluster();
        let data = serialize_cluster_with_options(&c, true, Some("secret-key")).unwrap();
        let restored = deserialize_cluster_with_password(&data, Some("secret-key")).unwrap();
        assert_eq!(
            restored.nodes.len(),
            1000,
            "compress+encrypt round-trip should preserve nodes"
        );

        // Verify it's smaller than unencrypted+uncompressed
        let raw = serialize_cluster(&c).unwrap();
        assert!(
            data.len() < raw.len(),
            "compress+encrypt should be smaller than raw"
        );
    }

    // ─── Backward Compatibility: v0x0001 Loading ─────────

    #[test]
    fn test_v1_backward_compatibility() {
        // Create a v0x0001 format file manually (no salt)
        let c = make_test_cluster();
        let mut content_buf = Vec::new();
        {
            let mut serializer = rmp_serde::Serializer::new(&mut content_buf).with_struct_map();
            c.serialize(&mut serializer).unwrap();
        }
        let content = content_buf;
        let hash = blake3::hash(&content);

        let mut buf = Vec::with_capacity(8 + content.len() + 32);
        buf.extend_from_slice(&MAGIC_BYTES); // 4 bytes
        buf.extend_from_slice(&0x0001u16.to_le_bytes()); // version = 0x0001
        buf.extend_from_slice(&0x0000u16.to_le_bytes()); // flags = none
        buf.extend_from_slice(&content); // content
        buf.extend_from_slice(hash.as_bytes()); // hash

        let restored = deserialize_cluster(&buf).unwrap();
        assert_eq!(
            restored.name, c.name,
            "v0x0001 format should load correctly"
        );
        assert_eq!(restored.nodes.len(), c.nodes.len());
    }
}
