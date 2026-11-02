const ALLOWED_PRODUCTION_USER_IDS = new Set(["719", "785"]);

/** Logged-in user 719 or 785 only. Login screen and every other user stay hidden. */
function shouldShowApiInspector(userId) {
  if (userId == null || userId === "") return false;
  return ALLOWED_PRODUCTION_USER_IDS.has(String(userId));
}

function readApiInspectorIdentity(raw) {
  const root = raw?.user ? raw : raw?.data?.user ? raw.data : raw?.data ?? raw;
  const user = root?.user ?? raw?.user ?? null;
  return {
    userId: user?.id ?? user?.user_id ?? root?.user_id ?? raw?.user_id ?? null,
    role: user?.role ?? root?.role ?? raw?.role ?? null,
    relatiesId: root?.relaties?.id ?? raw?.relaties?.id ?? root?.relaties_id ?? raw?.relaties_id ?? null,
  };
}

module.exports = {
  ALLOWED_PRODUCTION_USER_IDS,
  shouldShowApiInspector,
  readApiInspectorIdentity,
};
