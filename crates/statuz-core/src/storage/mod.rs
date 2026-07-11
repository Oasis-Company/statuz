use crate::cluster::Cluster;
use crate::graph::types::ClusterId;
use serde::Serialize;

// ─── Storage Format ──────────────────────────────────────────

/// The Statuz storage format — raw binary layout.
///
/// ```text
/// [magic: 4 bytes]   "STZ\0" (0x53 0x54 0x5A 0x00)
/// [version: 2 bytes] u16 little-endian, current = 0x0001
/// [flags: 2 bytes]   u16 LE, bit 0 = encrypted, bit 1 = compressed
/// [content: var]     msgpack-encoded Cluster
/// [hash: 32 bytes]   blake3 hash of content (NOT the full file)
/// ```
///
/// The hash covers only the content portion, so magic/version/flags
/// can be modified without invalidating the hash.
pub const MAGIC_BYTES: [u8; 4] = [0x53, 0x54, 0x5A, 0x00]; // "STZ\0"
pub const CURRENT_VERSION: u16 = 0x0001;
pub const MIN_SUPPORTED_VERSION: u16 = 0x0001;

/// Storage flags
pub const FLAG_NONE: u16 = 0x0000;
pub const FLAG_ENCRYPTED: u16 = 0x0001;
pub const FLAG_COMPRESSED: u16 = 0x0002;

/// Minimal header size: magic(4) + version(2) + flags(2) = 8 bytes
const HEADER_SIZE: usize = 8;
/// Minimum file size: header(8) + hash(32) = 40 bytes
const MIN_FILE_SIZE: usize = HEADER_SIZE + 32;

// ─── Error Type ──────────────────────────────────────────────

#[derive(Debug)]
pub enum StorageError {
    InvalidMagic([u8; 4]),
    UnsupportedVersion(u16),
    Corrupted(String),
    HashMismatch,
    EncodeError(String),
    DecodeError(String),
    IoError(std::io::Error),
}

impl std::fmt::Display for StorageError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            StorageError::InvalidMagic(magic) => {
                write!(f, "invalid magic bytes: expected {:02X?}, got {:02X?}", MAGIC_BYTES, magic)
            }
            StorageError::UnsupportedVersion(v) => {
                write!(f, "unsupported version 0x{:04X} (supported: 0x{:04X}..=0x{:04X})",
                    v, MIN_SUPPORTED_VERSION, CURRENT_VERSION)
            }
            StorageError::Corrupted(msg) => write!(f, "corrupted file: {}", msg),
            StorageError::HashMismatch => write!(f, "content hash mismatch: data may be corrupted"),
            StorageError::EncodeError(msg) => write!(f, "encode error: {}", msg),
            StorageError::DecodeError(msg) => write!(f, "decode error: {}", msg),
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

// ─── Serializer ──────────────────────────────────────────────

/// Serialize a Cluster into the Statuz storage format.
///
/// Raw binary output:
/// ```text
/// offset 0:  [STZ\0] [version] [flags] [content...] [blake3 hash]
///           4 bytes  2 bytes   2 bytes  variable     32 bytes
/// ```
pub fn serialize_cluster(cluster: &Cluster) -> Result<Vec<u8>, StorageError> {
    let content = rmp_serde::to_vec(cluster)
        .map_err(|e| StorageError::EncodeError(e.to_string()))?;

    let hash = blake3::hash(&content);

    let mut buf = Vec::with_capacity(HEADER_SIZE + content.len() + 32);
    buf.extend_from_slice(&MAGIC_BYTES);               // 4 bytes
    buf.extend_from_slice(&CURRENT_VERSION.to_le_bytes()); // 2 bytes
    buf.extend_from_slice(&FLAG_NONE.to_le_bytes());       // 2 bytes
    buf.extend_from_slice(&content);                       // variable
    buf.extend_from_slice(hash.as_bytes());                // 32 bytes

    Ok(buf)
}

/// Deserialize a Cluster from the Statuz storage format.
///
/// Validates magic bytes, version range, and blake3 hash integrity.
pub fn deserialize_cluster(data: &[u8]) -> Result<Cluster, StorageError> {
    if data.len() < MIN_FILE_SIZE {
        return Err(StorageError::Corrupted(format!(
            "file too short: {} bytes (minimum {})", data.len(), MIN_FILE_SIZE
        )));
    }

    // Read magic bytes
    let magic: [u8; 4] = data[0..4].try_into().unwrap();
    if magic != MAGIC_BYTES {
        return Err(StorageError::InvalidMagic(magic));
    }

    // Read version (range check for forward compatibility)
    let version = u16::from_le_bytes(data[4..6].try_into().unwrap());
    if version < MIN_SUPPORTED_VERSION || version > CURRENT_VERSION {
        return Err(StorageError::UnsupportedVersion(version));
    }

    // Read flags (not yet implemented beyond storage)
    let _flags = u16::from_le_bytes(data[6..8].try_into().unwrap());

    // Extract content and hash
    let hash_start = data.len() - 32;
    let content = &data[HEADER_SIZE..hash_start];
    let stored_hash: [u8; 32] = data[hash_start..].try_into().unwrap();

    // Verify hash integrity
    let computed = blake3::hash(content);
    if computed.as_bytes() != &stored_hash {
        return Err(StorageError::HashMismatch);
    }

    // Decode cluster from msgpack
    let cluster: Cluster = rmp_serde::from_slice(content)
        .map_err(|e| StorageError::DecodeError(e.to_string()))?;

    Ok(cluster)
}

// ─── Lightweight Verification ───────────────────────────────

/// Verify .stz file integrity without full deserialization.
///
/// Checks:
/// 1. File size >= minimum (header + hash)
/// 2. Magic bytes match "STZ\0"
/// 3. Version is in supported range
/// 4. blake3 hash of content matches stored hash
pub fn verify_stz_file(data: &[u8]) -> Result<(), StorageError> {
    if data.len() < MIN_FILE_SIZE {
        return Err(StorageError::Corrupted(format!(
            "file too short: {} bytes (minimum {})", data.len(), MIN_FILE_SIZE
        )));
    }

    let magic: [u8; 4] = data[0..4].try_into().unwrap();
    if magic != MAGIC_BYTES {
        return Err(StorageError::InvalidMagic(magic));
    }

    let version = u16::from_le_bytes(data[4..6].try_into().unwrap());
    if version < MIN_SUPPORTED_VERSION || version > CURRENT_VERSION {
        return Err(StorageError::UnsupportedVersion(version));
    }

    let hash_start = data.len() - 32;
    let content = &data[HEADER_SIZE..hash_start];
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
    serde_json::to_string_pretty(cluster)
        .map_err(|e| StorageError::EncodeError(e.to_string()))
}

/// Export a Cluster to compact JSON (smaller, no whitespace).
pub fn export_cluster_json_compact(cluster: &Cluster) -> Result<String, StorageError> {
    serde_json::to_string(cluster)
        .map_err(|e| StorageError::EncodeError(e.to_string()))
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