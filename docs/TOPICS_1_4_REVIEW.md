# Topics 1–4: implementation and review

Branch: `feature/location-sessions-verification-uploads`. No deployment work, commits or pushes are part of this change.

## Design direction

Extend AgriBridge's existing forest-green portal with clear grouped forms, private evidence cards, readable review reports and an interactive farm map. Keep registration and trading rules unchanged. No new stock imagery or generated assets. Use the existing typography/spacing, SVG map pin, mobile camera/gallery controls and keyboard-accessible inputs. Maps include OpenStreetMap attribution and manual-coordinate/GPS-denied fallbacks. A connected browser was unavailable for screenshot verification; builds and HTTP checks do not substitute for visual review.

## Setup for local review

Keep the existing Neon connection, application secrets, SMTP and Paystack settings. Do not replace `server/.env` with the example.

1. `cd client && npm ci`
2. In `server`, activate `.venv` and run `pip install -r requirements.txt` (or sync Pipenv's updated lockfile).
3. Back up/select the intended review database or Neon development branch. Run `flask --app run.py db current`, then `flask --app run.py db upgrade` once against that database. Current revision: `e56b8c2fd005`, following `d45a7b1ec004`. The implementation has not applied it to the shared Neon database.
4. New images and verification PDFs are stored as binary data in PostgreSQL/Neon. No Cloudinary credentials or add-on subscription is required for new uploads. Keep the existing `DATABASE_URL` and application secrets.
5. Uploads retain format, size, image decoding and PDF content checks. Private evidence is reviewed manually by the assigned officer and administrator. No malware-scanning service is called.
6. Run the API, worker and frontend in separate terminals as documented in `server/README.md`. Restart both backend processes after changing environment settings. The worker cleans up removed draft/product files and handles order/payment/email work; it does not scan uploads.
7. Existing browser tokens must sign in again: sessions now require their own tab identifier. Existing password hashes still authenticate; the stronger policy applies when a password is created or replaced.

Existing Cloudinary rows remain in place and are not downloaded or migrated automatically. Their private previews still need the original backend Cloudinary credentials. New files bypass that provider entirely.

## Topic 1: location

- General users register without a location and open the marketplace.
- New buyer profiles require county, subcounty and town/area; completion still enables purchasing immediately.
- Farmers can save incomplete farm drafts. Verification submission requires county, subcounty, ward, a farm pin within the approximate Kenya extent, directions, landmark and land tenure.
- Pick a pin by map click, marker drag, device GPS or manual coordinates. Being denied GPS permission does not block manual entry. The officer must confirm the pin at inspection; no ownership/boundary proof is inferred from GPS.
- Public listings use the general location. Pins/directions remain in the owner's profile and authorized application review.
- Administrators can configure officer county/subcounty coverage; matching coverage is suggested during assignment, never automatically grants access.
- A submitted application snapshots the location and land tenure. In-progress applications block changes to submitted farm location/tenure. Changing an approved farm's name or location requires verification again.
- Existing location text is retained; codes are not guessed. Reference data has known historical/inferred mappings—see `server/app/data/LOCATION_DATA.md`.

## Topic 2: independent tab sessions

- Every login creates a separate backend session with tab-bound access and rotating refresh credentials. Authentication stays in tab-scoped session storage, not shared cookies/local storage.
- Different users or the same user can use multiple tabs independently. Refresh preserves the current tab. Opening/duplicating a tab with copied credentials triggers an ownership check and clears the copied login without revoking the original.
- Browsers without BroadcastChannel cannot safely restore tab authentication and require login again. Modern browser duplication, reload, Back/Forward and slow/background tabs need manual browser validation.
- Buyer/farmer idle timeout: 60 minutes, absolute maximum: 24 hours. Staff-capable accounts: 15 minutes and 8 hours, even in a buyer dashboard. The server enforces limits.
- Pointer/key/scroll/touch interaction reports activity; polling, file requests and profile refreshes do not. A warning appears in the last two minutes. Maximum lifetime cannot be extended by activity.
- Account settings lists approximate browser/session information with current-tab sign-out, other-session sign-out and all-session sign-out. Reset/change password revokes all account sessions. Recent password confirmation is required for sensitive administrative changes and multi-session revocation.
- A late refresh response cannot restore credentials after logout. Refresh replay revokes only that session. Logout works with refresh credentials after access-token expiry.
- Cart, profile drafts and inspection text drafts remain tab/account-scoped. Selected local files cannot be restored after navigation/reload: select them again; successfully uploaded evidence remains in the database. Passwords/file bytes are never stored in drafts.
- Sessions are not a guarantee that the server knows the instant a tab closes; unused sessions expire server-side. JavaScript-readable credentials require continued XSS prevention and careful third-party script review.

## Topic 3: password strength, unchanged onboarding

New/replaced passwords require 12 characters, ASCII uppercase/lowercase, a number, a special character, no predictable common-password root, and at most 72 UTF-8 bytes (bcrypt limit). Confirmation must match when supplied. The UI provides a live checklist and retains password-manager/paste support. The model/API enforce the policy, including staff provisioning. Reset links remain single-use and expiring. No email-verification step was added.

Development seed accounts now use `AgriBridgeDemo123!`; existing accounts are not silently reset. Never run the development seed against shared data just to update a password.

## Topic 4: device/camera uploads and private evidence

- Device files and mobile camera capture replace URL entry for new uploads. Unsupported capture/browser image formats have file-selection/export-as-JPEG alternatives. Client photo optimization and backend image decoding remove EXIF metadata. Document text must remain readable.
- Image limit: 5 MiB after processing; PDF limit: 10 MiB. PDFs must be readable and unencrypted, with at most 100 pages and no detected embedded scripts/attachments. This content validation does not claim to perform malware scanning. Backend request limit allows multipart overhead.
- Owners: 3–5 farm photos plus title deed pages. Leaseholders: photos, lease and supporting ownership evidence. Family land: photos, owner/family authorization and supporting ownership evidence. National ID is not required.
- Evidence can be a multipage PDF or ordered image pages. Users preview selected images, remove/retake before upload, see progress and retry failed files. Select/reorder uploaded evidence before submission.
- New uploads store their contents in `media_contents` (`BYTEA` on PostgreSQL), separately from metadata in `media_assets`. Private previews/downloads require backend authorization and two-minute signed links. These bearer links can be shared until expiry, but session revocation, password changes and current access permissions are rechecked when opened.
- Product photographs become publicly available through `/api/media/:id/public` after content validation and while the farmer/product is eligible for publication. Neon stores both file bytes and their ownership, validation/review metadata, application association and public app URLs. Files are served through Flask; the frontend never connects to Neon directly.
- Available content-validated files can be submitted immediately for manual review. Foreign, deleted, reused or historically blocked files cannot satisfy submission requirements. Files previously flagged as unsafe remain blocked and require replacement; no human-review action clears that historical restriction.
- Submitted evidence is immutable. Rejected applications retain their original evidence and feedback; a replacement application uses new uploads. Officers upload visit photos and optional PDF reports, write findings, enter the visit date and confirm the location. At least one validated visit photo and the written report are required; a location mismatch cannot be approved. Admins make the final decision.
- Removed drafts/product files are made inaccessible through the app and queued for binary-content deletion by the worker (legacy Cloudinary files use provider cleanup). Submitted evidence is retained for audit. Database storage and backups now include the uploaded files; track database size and set a retention policy before production. Migration downgrade refuses to discard stored file contents; export them before downgrading.

## Manual acceptance checklist

- Register a general user with a strong mixed password; automatic login opens the marketplace. Test each missing password category and mismatched confirmation.
- In A and B sign into the same account; in C use another account. Sign out A and confirm B/C remain signed in. Duplicate B and confirm the duplicate requires login; reload B and confirm it remains signed in. Test staff and buyer inactivity/absolute expiry and explicit global logout.
- Complete a buyer location using linked lists. Save a partial farm, then finish its pin, directions, landmark and tenure. Deny GPS and place a pin manually. Check existing written locations remain visible for correction.
- Upload device/camera farm photos and each supported land-evidence alternative. Try an invalid image, encrypted PDF, oversized file, unreadable evidence and a historically blocked file. Confirm invalid submissions are blocked appropriately. Review page order and replacement behavior.
- Assign an officer, open the farm in maps, inspect private evidence, upload visit photos, record a decision and specific findings for every farmer file, and confirm the document-review checkbox before submitting findings. Test a location discrepancy/rejection/corrected new application, then approval. Administrator approval requires accepted officer decisions for all farmer evidence and the administrator’s own accepted decisions for every evidence file, including inspection attachments. The administrator also confirms document review. Every file decision is appended to the audit history; finalized applications cannot have reviews silently changed. An unrelated user/officer must not open the files.
- Add product images from camera/gallery, verify a validated image is public only for an eligible farmer/product. Remove it and check public access stops.
- Recheck product HTML SSR, farmer-confirmed orders and Paystack test payments. Login again after session expiry without losing cart/profile/inspection drafts.

New-upload checks use local database storage without provider calls. PostgreSQL checks use a disposable local database, not the shared Neon project. Browser visual and mobile-camera checks remain pending because no browser is connected.
