# Vendor Allergen Attestation Terms — DRAFT

> **DRAFT — NOT LEGAL ADVICE.** This is placeholder language for the SafePlate
> vendor onboarding flow. Before we surface this to real vendors, it must be
> reviewed by counsel and localized per jurisdiction. Do not treat any of the
> below as final contract text.

## 1. Vendor Attestation

By tagging (or explicitly un-tagging) a menu item with an allergen on
SafePlate, the vendor **warrants** that:

1. The item, as prepared and delivered, contains all allergens listed in
   `allergenTags` and does **not** contain any allergen that the vendor has
   explicitly marked as absent in the item's `allergenAttestation`.
2. The `facilityAllergensHandled` disclosure on the vendor's profile is
   complete and current for the facility that prepares the item — including
   any allergen that is handled on the same equipment or in the same
   preparation area, even if not present in a specific dish.
3. The vendor will re-attest allergen accuracy on the daily / per-window
   verification cadence configured by the platform (`requireDailyVerification`,
   `verificationWindowHours`) whenever the platform requires it.
4. If an ingredient, supplier, recipe, or preparation change materially
   affects the allergen content of an item, the vendor will update the item —
   or take it offline — **before** accepting new orders for it.

## 2. Platform Role

SafePlate provides tooling: safety-gate blocks on `criticalAllergens`, stale
verification hiding, kitchen-level cross-contact disclosure, and an audit
snapshot of `allergenTags` on each purchased line item. SafePlate does **not**
independently test, inspect, or certify vendor kitchens. Certifications listed
in `vendorSettings.certifications` are self-reported until reviewed
(`certificationsReviewStatus === 'approved'`); consumers see them as
"unverified" until the platform admin has completed a review.

## 3. Consumer Acknowledgment

Consumers acknowledge that:

1. Menu tags and vendor disclosures represent the vendor's best good-faith
   description at time of ordering, and that food preparation is inherently
   variable.
2. Consumers with life-threatening allergies must use the "block facility
   cross-contact" toggle and configure `criticalAllergens` to their true
   restriction list. The safety gate on order creation checks these fields; if
   they are wrong or empty, the gate cannot help.
3. Consumers should still confirm allergen safety with the receiving group
   home / caregiver before serving.

## 4. Liability & Indemnity (Placeholder)

The vendor agrees to indemnify and hold harmless SafePlate, its affiliates,
and its employees from any claim, loss, or damage arising from (a) an
inaccurate allergen tag or attestation the vendor submitted, (b) a failure to
update or remove an item after a material change, or (c) a failure to disclose
an allergen handled in the vendor's facility.

SafePlate's aggregate liability to any consumer or vendor for allergen-related
claims is limited to the platform fees collected from the specific order at
issue.

*(Actual indemnity, insurance, and cap language must be drafted by counsel.
This section is intentionally short.)*

## 5. Enforcement

Repeated or severe attestation failures may result in:

- Automatic removal of the vendor from marketplace listings.
- Reversal of the certification review status to `rejected`.
- Suspension of new order acceptance (`acceptingNewContracts = false`).
- Termination of the vendor's platform account.

## 6. Definitions

- **allergenTags**: The list of allergens present in a menu item, per FDA
  major allergen categories plus sesame and gluten.
- **allergenAttestation**: The per-item confirmation blob stored alongside a
  menu item, capturing which tags the vendor has confirmed present, which
  they have confirmed absent, who attested, and when.
- **facilityAllergensHandled**: Allergens handled anywhere in the vendor's
  preparation facility, whether or not they appear in any specific menu item.
- **stale item**: A menu item whose `lastVerifiedAt` is older than the
  platform-configured verification window. Stale items are hidden from
  consumer-facing marketplace listings when
  `platformRules.inventory.requireDailyVerification` is enabled.

---

*Document status: DRAFT — pending legal review.*
