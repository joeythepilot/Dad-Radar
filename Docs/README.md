# Dad Radar Documentation

Welcome to the Dad Radar project documentation.

This repository is organized so that anyone can understand the project from the highest-level vision down to the implementation details.

---

# Reading Order

If you're new to the project, read the documents in this order.

---

## 1. Product Vision

**Product-vision.md**

Explains what Dad Radar is, who it's for, and why it exists.

This answers:

> Why are we building this?

---

## 2. Design Canon

**Design-Canon.md**

The single source of truth for the product's identity.

This document defines the permanent design philosophy, emotional goals, aesthetic, and user experience principles.

This should rarely change.

This answers:

> What should Dad Radar always be?

---

## 3. Project Decisions

**Project-Decisions.md**

A chronological record of important design and engineering decisions.

This prevents revisiting old discussions and explains why choices were made.

This answers:

> Why did we build it this way?

---

## 4. Roadmap

**Roadmap.md**

Major milestones and future development goals.

This answers:

> What's next?

---

## 5. Feature Backlog

**Feature-backlog.md**

A prioritized list of current and future features.

This answers:

> What should we build?

---

## 6. Software Architecture

**Software-architecture.md**

Describes the technical architecture of the application.

This answers:

> How is the software organized?

---

## 7. Application Structure

**Application structure.md**

Describes the folder organization and responsibilities of each part of the application.

This answers:

> Where does everything belong?

---

## 8. Data Flow

**Dataflow.md**

Documents how information moves through the application.

This answers:

> How does data travel through the system?

---

## 9. Design Bible

**Design-bible.md**

The implementation guide for the visual language.

Contains practical design standards including:

- Layout rules
- Typography
- Colors
- Component spacing
- Animation timing
- Materials
- UI standards
- Visual consistency

This answers:

> How should Dad Radar look and behave?

---

# UI Documentation

The `/UI` folder contains detailed specifications for each console module.

Examples include:

- Console Layout
- Split-Flap Module
- Moving Map Module
- Destination Poster Module
- Instrument Module
- Power Module
- Component Library

These documents describe each portion of the interface in implementation detail.

---

# Documentation Rules

1. Document important decisions before implementation.

2. Update the Design Canon only when intentionally changing the product vision.

3. Record significant decisions in Project-Decisions.md.

4. Keep implementation details inside the Design Bible and UI documentation.

5. Every document should have one clear purpose.

6. Avoid duplicate information whenever possible.

7. When in doubt, update existing documentation instead of creating new documents.

---

# Guiding Principle

Good documentation should reduce questions, not create them.

Every future design discussion should begin by checking whether the answer already exists somewhere in this documentation.
