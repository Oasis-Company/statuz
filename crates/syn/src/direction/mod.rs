//! Direction subsystem — shared representation of "which way we're going".
//!
//! Lives in the Representation layer (ADR-0001). Carriers, co-editing, and
//! escalation belong here, not in the kernel.

pub mod carrier;
pub mod coedit;
pub mod h3_eval;
pub mod seed;