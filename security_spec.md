# Firestore Security Specification - EthioVault

## Data Invariants
1. Users must have a profile in the `users` collection to operate, except for initial onboarding.
2. Inventory items must have a valid status and belong to a branch.
3. Transactions must be recorded in the ledger with a valid type and amount.
4. Bank accounts and transactions are sensitive and should only be modifiable by administrators.
5. All IDs must follow the standard ID pattern.

## The "Dirty Dozen" Payloads (Test Cases)

### Identity & Spoofing
1. **Payload**: `auth: {uid: "attacker"}, data: {ownerId: "victim"}` (in `users` collection create)
   - **Expectation**: `PERMISSION_DENIED`
2. **Payload**: `auth: {uid: "clerk"}, data: {role: "admin"}` (updating own role)
   - **Expectation**: `PERMISSION_DENIED`
3. **Payload**: `auth: {uid: "victim"}, data: {bankName: "Hacked"}` (attacker updating victim's bank account)
   - **Expectation**: `PERMISSION_DENIED` (if not admin)

### Integrity & Validation
4. **Payload**: `data: {amount: "one million"}` (string instead of number)
   - **Expectation**: `PERMISSION_DENIED` (Type check)
5. **Payload**: `data: {valuation: -100}` (negative valuation)
   - **Expectation**: `PERMISSION_DENIED` (Boundary check)
6. **Payload**: `data: {status: "UNKNOWN_STATUS"}` (invalid enum)
   - **Expectation**: `PERMISSION_DENIED` (Enum check)
7. **Payload**: `data: {shadow_field: "hidden"}` (extra field not in schema)
   - **Expectation**: `PERMISSION_DENIED` (Strict schema check)

### State & Logic
8. **Payload**: `data: {status: "SETTLED"}` (updating a transaction already marked as "COMPLETED")
   - **Expectation**: `PERMISSION_DENIED` (State lock)
9. **Payload**: `data: {imei: "123"}` (too short IMEI)
   - **Expectation**: `PERMISSION_DENIED` (Size check)
10. **Payload**: `data: {bankAccountId: "non-existent-account"}` (creating transaction for ghost account)
    - **Expectation**: `PERMISSION_DENIED` (Relational check)

### Resource Poisoning
11. **Payload**: `docId: "a".repeat(2000)` (ultra long doc ID)
    - **Expectation**: `PERMISSION_DENIED` (ID Hardening)
12. **Payload**: `data: {note: "b".repeat(2000000)}` (ultra long string)
    - **Expectation**: `PERMISSION_DENIED` (Size guard)

## Test Runner (firestore.rules.test.ts)
*(Note: This is a conceptual test runner for the Red Team audit)*
