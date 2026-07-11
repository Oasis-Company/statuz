use crate::cluster::Cluster;
use crate::graph::types::ClusterId;
use blake3::Hash;
use serde::{Deserialize, Serialize};

// ─── Storage Format ──────────────────────────────────────────

/// The Statuz storage format header.
/// Every stored Cluster starts with this header.
///
/// Format layout:
/// ```text
/// [magic bytes: 4 bytes]  "STZ\0"
/// [version: 2 bytes]      0x0001
/// [flags: 2 bytes]        encryption, compression flags
/// [content: variable]     msgpack-encoded Cluster data
/// [hash: 32 bytes]        blake3 hash of content
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageHeader {
    pub magic: [u8; 4],      // "STZ\0"
    pub version: u16,         // 0x0001
    pub flags: u16,           // bit 0: encrypted, bit 1: compressed
}

pub const MAGIC_BYTES: [u8; 4] = [0x53, 0x54, 0x5A, 0x00]; // "STZ\0"
pub const CURRENT_VERSION: u16 = 0x0001;

/// Storage flags
pub const FLAG_NONE: u16 = 0x0000;
pub const FLAG_ENCRYPTED: u16 = 0x0001;
pub const FLAG_COMPRESSED: u16 = 0x0002;

/// Full storage envelope
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageEnvelope {
    pub header: StorageHeader,
    /// msgpack-serialized Cluster data
    pub content: Vec<u8>,
    /// blake3 hash of content (for integrity verification)
    pub hash: [u8; 32],
}

// ─── Serializer ──────────────────────────────────────────────

/// Serialize a Cluster into the Statuz storage format.
///
/// Process:
/// 1. Serialize Cluster to msgpack (compact binary)
/// 2. Hash the content with blake3
/// 3. Wrap in StorageEnvelope with header
pub fn serialize_cluster(cluster: &Cluster) -> Result<Vec<u8>, String> {
    // Serialize to msgpack
    let content = rmp_serde::to_vec(cluster).map_err(|e| format!("msgpack encode error: {}", e))?;

    // Hash content with blake3
    let hash = blake3::hash(&content);

    // Build envelope
    let envelope = StorageEnvelope {
        header: StorageHeader {
            magic: MAGIC_BYTES,
            version: CURRENT_VERSION,
            flags: FLAG_NONE,
        },
        content: content.clone(),
        hash: *hash.as_bytes(),
    };

    // Serialize envelope to msgpack (final output)
    rmp_serde::to_vec(&envelope).map_err(|e| format!("envelope encode error: {}", e))
}

/// Deserialize a Cluster from the Statuz storage format.
pub fn deserialize_cluster(data: &[u8]) -> Result<Cluster, String> {
    // Decode envelope from msgpack
    let envelope: StorageEnvelope = rmp_serde::from_slice(data)
        .map_err(|e| format!("envelope decode error: {}", e))?;

    // Verify magic bytes
    if envelope.header.magic != MAGIC_BYTES {
        return Err(format!(
            "invalid magic bytes: expected {:02X?}, got {:02X?}",
            MAGIC_BYTES, envelope.header.magic
        ));
    }

    // Verify version
    if envelope.header.version != CURRENT_VERSION {
        return Err(format!(
            "unsupported version: expected 0x{:04X}, got 0x{:04X}",
            CURRENT_VERSION, envelope.header.version
        ));
    }

    // Verify hash integrity
    let computed = blake3::hash(&envelope.content);
    if computed.as_bytes() != &envelope.hash {
        return Err("content hash mismatch: data may be corrupted".to_string());
    }

    // Decode cluster from msgpack
    let cluster: Cluster = rmp_serde::from_slice(&envelope.content)
        .map_err(|e| format!("cluster decode error: {}", e))?;

    Ok(cluster)
}

// ─── Hash ID Generation ─────────────────────────────────────

/// Generate a content-addressable Cluster ID from the cluster data.
/// The ID is the first 16 bytes of the blake3 hash, hex-encoded.
pub fn generate_cluster_id(cluster: &Cluster) -> ClusterId {
    // Serialize just enough to get a stable hash
    let content = serde_json::to_vec(cluster).unwrap_or_default();
    let hash = blake3::hash(&content);
    hex::encode(&hash.as_bytes()[..16])
}

/// Verify a password against the cluster's stored hash.
/// Password is optional — if the cluster has no password_hash, it's unlocked.
pub fn verify_password(cluster: &Cluster, password: &str) -> bool {
    match &cluster.password_hash {
        None => true, // No password set
        Some(hash) => {
            // Use argon2 for verification
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

    let salt = SaltString::generate(&mut rand::thread_rng());
    let hash = argon2::Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| format!("password hash error: {}", e))?;
    Ok(hash.to_string())
}

use argon2::PasswordHasher;
use argon2::password_hash::SaltString;
use rand::Rng;

// We need a thread_rng that doesn't conflict with rand crate
// Let's use a simple approach
fn thread_rng() -> impl Rng {
    rand::rngs::OsRng
}