import { GlobalContextData } from "@/src/context/GlobalContext";
import {
  ApiInspectorIdentity,
  ApiLogEntry,
  getApiLogEntries,
  installApiInspector,
  isApiInspectorAllowed,
  readApiInspectorIdentity,
  setApiInspectorIdentity,
  subscribeApiLog,
} from "@/src/dev/apiInspectorLog";
import { getData } from "@/src/utils/storeData";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BUTTON = 54;

function pathOf(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\/api\//, "") || parsed.pathname;
  } catch {
    return url;
  }
}

function clock(at: number): string {
  const date = new Date(at);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export default function ApiInspector() {
  const { UserData } = useContext(GlobalContextData);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<ApiLogEntry[]>(getApiLogEntries);
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const position = useRef({
    x: Math.max(12, width - BUTTON - 16),
    y: Math.max(12, height - BUTTON - 150),
  });
  const [origin, setOrigin] = useState(position.current);
  const [storedIdentity, setStoredIdentity] = useState<ApiInspectorIdentity | null>(null);
  const dragStart = useRef(position.current);
  const moved = useRef(false);

  const contextIdentity = readApiInspectorIdentity(UserData);
  const identity = isApiInspectorAllowed(contextIdentity)
    ? contextIdentity
    : isApiInspectorAllowed(storedIdentity)
      ? storedIdentity
      : contextIdentity?.userId
        ? contextIdentity
        : storedIdentity;
  const allowed = isApiInspectorAllowed(identity);
  const identityKey = `${identity?.userId ?? ""}|${identity?.role ?? ""}|${identity?.relatiesId ?? ""}|${allowed ? 1 : 0}`;
  const appliedIdentity = useRef("");
  if (appliedIdentity.current !== identityKey) {
    appliedIdentity.current = identityKey;
    setApiInspectorIdentity(allowed ? identity : null);
  }

  useEffect(() => {
    let alive = true;
    getData("USERDATA")
      .then((stored: any) => {
        if (!alive) return;
        setStoredIdentity(readApiInspectorIdentity(stored));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [UserData]);

  useEffect(() => {
    installApiInspector();
  }, []);

  useEffect(() => subscribeApiLog(() => setEntries(getApiLogEntries())), []);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
        onPanResponderGrant: () => {
          moved.current = false;
          dragStart.current = position.current;
        },
        onPanResponderMove: (_, gesture) => {
          if (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4) {
            moved.current = true;
          }
          const maxX = Math.max(8, width - BUTTON - 8);
          const maxY = Math.max(insets.top + 8, height - BUTTON - insets.bottom - 8);
          const x = Math.min(maxX, Math.max(8, dragStart.current.x + gesture.dx));
          const y = Math.min(maxY, Math.max(insets.top + 8, dragStart.current.y + gesture.dy));
          position.current = { x, y };
          setOrigin({ x, y });
        },
      }),
    [height, insets.bottom, insets.top, width],
  );

  if (!allowed) return null;

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <View
        style={[styles.button, { left: origin.x, top: origin.y }]}
        {...pan.panHandlers}
      >
        <Pressable
          style={styles.buttonPress}
          onPress={() => {
            if (moved.current) return;
            setOpen(true);
          }}
        >
          <Text style={styles.buttonText}>API</Text>
          <Text style={styles.buttonCount}>{entries.length}</Text>
        </Pressable>
      </View>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.sheet, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Latest APIs</Text>
                <Text style={styles.sheetHint}>Last {MAX_LABEL} calls</Text>
              </View>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Text style={styles.close}>Close</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
              {entries.length === 0 ? (
                <Text style={styles.empty}>No API calls yet.</Text>
              ) : (
                entries.map((entry) => {
                  const expanded = expandedId === entry.id;
                  return (
                    <Pressable
                      key={entry.id}
                      style={styles.card}
                      onPress={() => setExpandedId(expanded ? null : entry.id)}
                    >
                      <View style={styles.cardTop}>
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: entry.ok ? "#1F8F4E" : "#D64545" },
                          ]}
                        />
                        <View style={styles.cardMain}>
                          <Text style={styles.cardPath} numberOfLines={expanded ? 3 : 1}>
                            {pathOf(entry.url)}
                          </Text>
                          <Text style={styles.cardMeta}>
                            {entry.method} · {entry.status ?? "—"} · {entry.durationMs}ms · {clock(entry.at)}
                          </Text>
                        </View>
                        <Text style={styles.chevron}>{expanded ? "−" : "+"}</Text>
                      </View>

                      {expanded ? (
                        <View style={styles.detail}>
                          <Text style={styles.label}>URL</Text>
                          <Text style={styles.mono} selectable>
                            {entry.url}
                          </Text>
                          {entry.errorText ? (
                            <>
                              <Text style={styles.label}>Error</Text>
                              <Text style={styles.error} selectable>
                                {entry.errorText}
                              </Text>
                            </>
                          ) : null}
                          <Text style={styles.label}>Request</Text>
                          <Text style={styles.mono} selectable>
                            {entry.requestText}
                          </Text>
                          <Text style={styles.label}>Response</Text>
                          <Text style={styles.mono} selectable>
                            {entry.responseText}
                          </Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const MAX_LABEL = 5;

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  button: {
    position: "absolute",
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    backgroundColor: "#14213D",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  buttonPress: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  buttonCount: {
    color: "#F5C542",
    fontSize: 11,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    height: "88%",
    backgroundColor: "#F6F7F9",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#14213D",
  },
  sheetHint: {
    marginTop: 2,
    fontSize: 12,
    color: "#667085",
  },
  close: {
    color: "#C2410C",
    fontSize: 15,
    fontWeight: "700",
  },
  list: {
    gap: 10,
    paddingBottom: 20,
  },
  empty: {
    marginTop: 24,
    textAlign: "center",
    color: "#667085",
    fontSize: 14,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E6E8EC",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardMain: {
    flex: 1,
  },
  cardPath: {
    color: "#14213D",
    fontSize: 14,
    fontWeight: "700",
  },
  cardMeta: {
    marginTop: 3,
    color: "#667085",
    fontSize: 12,
  },
  chevron: {
    color: "#14213D",
    fontSize: 20,
    fontWeight: "700",
    width: 18,
    textAlign: "center",
  },
  detail: {
    marginTop: 12,
    gap: 4,
  },
  label: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "#344054",
  },
  mono: {
    fontSize: 12,
    lineHeight: 18,
    color: "#101828",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 8,
  },
  error: {
    fontSize: 12,
    lineHeight: 18,
    color: "#B42318",
    backgroundColor: "#FEF3F2",
    borderRadius: 8,
    padding: 8,
  },
});
