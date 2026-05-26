/**
 * contacts.ts — Google People API wrapper.
 *
 * Fetches the signed-in user's Google contacts using the access token obtained
 * during login (contacts.readonly scope must be requested).
 *
 * Results are cached per access-token for the lifetime of the page.
 * If the People API is not enabled in Google Cloud Console, the function
 * throws with a clear message and the UI falls back to manual email input.
 */

export interface GoogleContact {
  name: string;
  email: string;
  photoUrl?: string;
}

// Module-level cache — survives re-renders, cleared on page reload.
let _cache: GoogleContact[] | null = null;
let _cachedToken: string | null = null;

export async function getOrFetchContacts(accessToken: string): Promise<GoogleContact[]> {
  if (_cache && _cachedToken === accessToken) return _cache;

  const url =
    'https://people.googleapis.com/v1/people/me/connections' +
    '?personFields=names,emailAddresses,photos&pageSize=500&sortOrder=FIRST_NAME_ASCENDING';

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    if (resp.status === 403) {
      throw new Error(
        'People API neactivat. Activează-l în Google Cloud Console: APIs & Services → Enable APIs → People API.'
      );
    }
    throw new Error(`Google People API error ${resp.status}`);
  }

  const data: { connections?: unknown[] } = await resp.json();
  const contacts: GoogleContact[] = [];

  for (const person of (data.connections ?? []) as Record<string, unknown>[]) {
    const emails = (person.emailAddresses as { value?: string }[] | undefined) ?? [];
    const email = emails[0]?.value;
    if (!email) continue;

    const names = (person.names as { displayName?: string }[] | undefined) ?? [];
    const name = names[0]?.displayName ?? email;

    const photos = (person.photos as { url?: string }[] | undefined) ?? [];
    const photoUrl = photos[0]?.url;

    contacts.push({ name, email, photoUrl });
  }

  _cache = contacts;
  _cachedToken = accessToken;
  return contacts;
}

// Invalidate cache (call after logout).
export function clearContactsCache() {
  _cache = null;
  _cachedToken = null;
}
