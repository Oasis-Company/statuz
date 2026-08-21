//! Syn — change decision and audit for Statuz clusters.
//!
//! Representation-layer primitives for direction, co-creation, and escalation.
//! Per ADR-0001, SYN lives in the Representation layer, not the kernel.

pub mod direction;

pub use direction::carrier::DirectionCarrier;