import React from "react";
import { StyleSheet, View } from "react-native";

export default function PdfDocumentView({ source }: { source: string; onPageChange?: (page: number, total: number) => void; onError?: () => void }) {
  return <View style={styles.root}>{React.createElement("iframe" as never, { src: source, title: "PDF document", style: { border: 0, width: "100%", height: "100%" } } as never)}</View>;
}

const styles = StyleSheet.create({ root: { flex: 1, overflow: "hidden" } });
