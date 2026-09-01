import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

const safeFileName = (title: string) => {
  const clean = title.trim().replace(/[^a-z0-9 _-]+/gi, "").replace(/\s+/g, "-").slice(0, 80);
  return clean || "Holistic-Mind-document";
};

const shortHash = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  return Math.abs(hash).toString(36);
};

export async function cachePdf(url: string, title: string, refresh = false) {
  if (Platform.OS === "web") return url;
  const directory = new Directory(Paths.cache, "library-pdfs");
  directory.create({ intermediates: true, idempotent: true });
  const destination = new File(directory, `${safeFileName(title)}-${shortHash(url)}.pdf`);
  if (refresh && destination.exists) destination.delete();
  if (destination.exists && destination.size > 4) return destination.uri;
  const downloaded = await File.downloadFileAsync(url, destination, { idempotent: true });
  if (downloaded.size <= 4) {
    downloaded.delete();
    throw new Error("The downloaded PDF is empty");
  }
  return downloaded.uri;
}

export async function downloadPdf(url: string, title: string) {
  if (Platform.OS === "web") {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeFileName(title)}.pdf`;
    anchor.rel = "noopener";
    anchor.click();
    return url;
  }
  const directory = new Directory(Paths.document, "Holistic Mind PDFs");
  directory.create({ intermediates: true, idempotent: true });
  const destination = new File(directory, `${safeFileName(title)}.pdf`);
  const downloaded = await File.downloadFileAsync(url, destination, { idempotent: true });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(downloaded.uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: "Save PDF",
    });
  }
  return downloaded.uri;
}
