# CampusShield Security & Privacy Model

## 1. Threat Model & Design Goals

Campus safety applications operate under a hostile and delicate threat model. Unlike conventional corporate fleet tracking or consumer navigation tools, safety platforms must balance two adversarial risks simultaneously:
1. **Physical Safety Hazards:** Violent crime, kidnapping, stalking, medical emergencies, and silent disappearances.
2. **Surveillance Hazards:** Abuse of tracking features by university personnel, intrusive data mining, coercive control by abusive partners, and catastrophic data breaches exposing intimate student movements.

### Key Threat Actors

| Threat Actor | Motivation | Mitigation in CampusShield |
|---|---|---|
| **Curious / Rogue Staff** | Snooping on student nightlife and daily movements without justification. | **Zero-Surveillance Monitoring:** Staff only see anonymous rotating session tokens (`Trip-7F2A`). Real identities are locked in the Identity Vault and only unsealed on verified emergency triggers with permanent, immutable audit logging. |
| **Physical Attacker / Coercer** | Forcing a student to enter their password to cancel an alarm or mark themselves safe. | **3-Password Anti-Coercion Order:** Entering factors in the wrong sequence displays an identical `"Approved — Checked In"` screen on the device while silently dispatching a Priority-1 Coercion SOS to campus police. |
| **Network Eavesdropper** | Intercepting cellular or public Wi-Fi traffic to track student locations. | Mandatory TLS 1.3 encryption across all REST and WebSocket connections. Location pings carry zero student identifiers. |
| **Database Thief** | Stealing database backups to harvest student tracking and personal profiles. | `location_pings` strictly omits student IDs. `students_vault` stores PII encrypted under AES-256-GCM; compromised database dumps cannot link GPS trails to individuals without the hardware-protected key. |
| **Device Thief / Finder** | Inspecting local storage on a lost or stolen student phone. | No sensitive trip histories or student vault decryption keys are stored on the mobile device. Sessions can be remotely invalidated. |

---

## 2. Cryptographic Architecture

### 2.1 AES-256-GCM Identity Vault

All Personally Identifiable Information (PII)—including student names, photos, dorm room numbers, emergency contact details, and medical notes—is encrypted using **Advanced Encryption Standard in Galois/Counter Mode (AES-256-GCM)** before writing to the database.

- **Key Size:** 256 bits (32 bytes), loaded via `VAULT_ENCRYPTION_KEY`.
- **Initialization Vector (IV):** 96 bits (12 bytes), generated freshly for every encryption operation using a cryptographically secure pseudorandom number generator (`crypto.randomBytes(12)`). IVs are never reused.
- **Authentication Tag:** 128 bits (16 bytes), verifying ciphertext integrity and authenticity.
- **Packed Payload Format:**
  ```
  ┌───────────────────┬────────────────────────┬────────────────────────────────────────┐
  │ IV (12 Bytes)     │ Auth Tag (16 Bytes)    │ Ciphertext (Variable Length)           │
  └───────────────────┴────────────────────────┴────────────────────────────────────────┘
  ```
- **Tamper Detection:** If any byte of the ciphertext or tag is modified, GCM verification fails and throws a runtime exception, preventing padding-oracle and bit-flipping attacks.

### 2.2 Argon2id Factor Hashing

Passwords and anti-coercion factors are hashed using **Argon2id** (the winner of the Password Hashing Competition), which combines defense against side-channel and GPU-based brute-force attacks:

- Factor 0 (Numeric PIN): Argon2id
- Factor 1 (Grid Pattern): Node sequence serialized and hashed with Argon2id
- Factor 2 (Passphrase): Argon2id

---

## 3. 3-Password Ordered Anti-Coercion Protocol

The verification engine guarantees that **honest mistakes never trigger false alarms**, while **coerced check-ins silently summon immediate help**.

### Step-by-Step Evaluation Routine

1. The mobile app collects all 3 inputs without revealing intermediate validation results.
2. The server queries `student_auth_factors` for `hash_pin`, `hash_pattern`, `hash_passphrase`, and `expected_order` (e.g., `[2, 0, 1]`).
3. For each input $i \in \{0, 1, 2\}$, the server checks if it matches any stored factor hash:
   - If it matches `hash_pin`, index is `0`.
   - If it matches `hash_pattern`, index is `1`.
   - If it matches `hash_passphrase`, index is `2`.
4. **Typo Handling:** If any input does not match any factor hash, the server immediately returns `HTTP 401 { "error": "Wrong password, please try again" }`. No emergency alert is triggered.
5. **Legitimate Check-In:** If all 3 inputs match and `entered_order == expected_order`:
   - Returns `HTTP 200 { "status": "APPROVED" }`.
   - The check-in deadline is extended by `checkin_interval_hours`.
6. **Coerced Check-In:** If all 3 inputs match but `entered_order != expected_order`:
   - Returns **identical** `HTTP 200 { "status": "APPROVED" }`.
   - The mobile UI displays `"Approved — Checked In"`.
   - The backend creates an emergency trip record, unseals the student identity, writes to `unlock_audit_logs`, and pushes a **Priority-1 Coercion Emergency** to the dispatcher console.

---

## 4. Physical Duress & Gunpoint Anti-Extortion Architecture

In violent extortion, stalking, or armed robbery scenarios, an attacker may hold a student at gunpoint and force them to open their phone settings, display configured security factors, or reset passwords to disarm the system.

CampusShield implements a defense-in-depth physical duress protection model:

1. **Write-Once Zero-Knowledge Enclave (`isWriteOnly: true`):**
   - Security factors (Numeric PIN, Passphrase, Pattern, Fingerprint, Face ID) and their secret execution sequence can **only be set once** by the student during initial onboarding.
   - Once sealed, the stored factor values and arrangement sequence are irrevocably masked (`●●●● Argon2id Salted Hash — Irretrievable`). Even if an attacker physically seizes the unlocked phone and navigates to Settings, the factors cannot be viewed or read.

2. **Self-Service Device Reset Disablement:**
   - Any self-service attempt to overwrite or reconfigure factors on the mobile device returns `HTTP 403 COERCION_PROTECTED`:
     > *"Security factors are sealed in the zero-knowledge enclave and can only be set once by the student. Once set, factors cannot be viewed or modified on this device to protect against forced disclosure at gunpoint."*

3. **Hardware GPS Geofence Lockout (< 2.0 km UCR Campus Premises):**
   - Reset requests sent from outside university premises are automatically rejected with `HTTP 403 OFF_CAMPUS_GEO_LOCK`.
   - The device hardware GPS coordinates are verified on the backend via Haversine distance against the UC Riverside Campus Center (`33.9737, -117.3281`). Any off-campus reset attempt (e.g. from a mugging or off-campus location) is instantly blocked.

4. **Dual-Custody In-Person University Shared Key:**
   - Factor modification requires physical in-person presence at the UCPD Station (`3500 Canyon Crest Dr`).
   - A verified University Dispatcher or Police Officer must authenticate the student with physical university photo ID and generate a one-time cryptographic authorization key (`UCPD-DISPATCH-911`) from the Dispatch Console. Both the valid staff key AND verified on-campus GPS are required simultaneously for a factor reset.

---

## 5. Immutable Audit Logs (Non-Repudiation)

All identity decryption events are recorded in `unlock_audit_logs`. To guarantee non-repudiation and prevent tampering by university administrators or rogue staff, the database enforces an append-only trigger:

```sql
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable. UPDATE and DELETE operations are not permitted.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_immutable
    BEFORE UPDATE OR DELETE ON unlock_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_modification();
```

Any `UPDATE` or `DELETE` statement executed against `unlock_audit_logs` will immediately abort with an exception, even when attempted by administrative database roles.

---

## 6. Security Recommendations for University IT

1. **Key Management:** Store `VAULT_ENCRYPTION_KEY` in a dedicated secrets manager (such as HashiCorp Vault, AWS Secrets Manager, or Azure Key Vault) or a hardware security module (HSM).
2. **Reverse Proxy & TLS:** Place CampusShield behind NGINX, Caddy, or Cloudflare with strict TLS 1.3 and HSTS enabled.
3. **Database Network Isolation:** Restrict PostgreSQL port 5432 and Redis port 6379 so they are only accessible within the internal Docker bridge network (`cs-network`).
4. **Audit Review Cadence:** University compliance officers should periodically review `unlock_audit_logs` using the `/api/v1/panel/audit-logs` endpoint or the built-in panel viewer.
