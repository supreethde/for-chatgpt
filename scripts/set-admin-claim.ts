import { adminAuth } from '../src/lib/firebase-admin.ts';

async function setAdminClaim() {
  const uid = process.argv[2];

  if (!uid || uid.trim() === '') {
    console.error('Error: Please provide a valid Firebase Auth user UID as an argument.');
    console.error('Usage: npx tsx scripts/set-admin-claim.ts <USER_UID>');
    process.exit(1);
  }

  const cleanUid = uid.trim();

  try {
    // 1. Fetch user to verify existence and get existing custom claims
    const userRecord = await adminAuth.getUser(cleanUid);
    console.log(`Found user: ${userRecord.email || cleanUid} (UID: ${cleanUid})`);

    const currentClaims = userRecord.customClaims || {};
    const updatedClaims = {
      ...currentClaims,
      admin: true,
    };

    // 2. Assign custom claim
    await adminAuth.setCustomUserClaims(cleanUid, updatedClaims);

    console.log('Successfully set custom claim { admin: true }');
    console.log(`Updated claims for user ${cleanUid}:`, JSON.stringify(updatedClaims, null, 2));
    console.log(
      '\nIMPORTANT: The user must sign out and sign back in (or force refresh their token) for the custom claim to take effect.'
    );
    process.exit(0);
  } catch (error: any) {
    console.error(`Error setting admin claim for UID "${cleanUid}":`, error?.message || error);
    process.exit(1);
  }
}

setAdminClaim();
