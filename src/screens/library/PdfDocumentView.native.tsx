import React from "react";
import { StyleSheet, View } from "react-native";
import PdfRendererView from "react-native-pdf-renderer";

export default function PdfDocumentView({ source, onPageChange, onError }: { source: string; onPageChange?: (page: number, total: number) => void; onError?: () => void }) {
  return <View style={styles.clip}><PdfRendererView distanceBetweenPages={12} maxZoom={5} onError={onError} onPageChange={onPageChange} source={source} style={styles.viewer} /></View>;
}

const styles = StyleSheet.create({ clip: { flex: 1, overflow: "hidden", borderRadius: 22 }, viewer: { flex: 1, backgroundColor: "#E8DED2" } });
