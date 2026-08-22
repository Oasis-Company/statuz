//! Direction subsystem — shared representation of "which way we're going".
//!
//! Lives in the Representation layer (ADR-0001). Carriers, co-editing, and
//! escalation belong here, not in the kernel.

pub mod adjudicate;
pub mod carrier;
pub mod coedit;
pub mod confidence;
pub mod escalation;
pub mod h3_eval;
pub mod seed;
pub mod store;
pub mod syn_proposal;