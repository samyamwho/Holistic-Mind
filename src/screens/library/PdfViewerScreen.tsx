import React, { useCallback, useEffect, useState } from "react";
import { Alert, ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowLeft, Download, FileText, RefreshCw } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cachePdf, downloadPdf } from "../../services/library/pdfFiles";
import { appSansFont as sansFont } from "../../theme/typography";
import PdfDocumentView from "./PdfDocumentView";

type Params = { title?: string; url?: string };

export default function PdfViewerScreen({ navigation, route }: { navigation: any; route: { params?: Params } }) {
  const title = route.params?.title ?? "PDF document";
  const url = route.params?.url;
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (!url) { setError("This PDF has not been uploaded yet."); return; }
    setError(""); setSource(null);
    try { setSource(await cachePdf(url, title, refresh)); }
    catch { setError("We couldn’t load this PDF. Check your connection and try again."); }
  }, [title, url]);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!url || downloading) return;
    setDownloading(true);
    try { await downloadPdf(url, title); }
    catch { Alert.alert("Download failed", "We couldn’t save this PDF. Check your connection and try again."); }
    finally { setDownloading(false); }
  };

  return <View style={styles.root}><ImageBackground source={require("../../../assets/welcome/paper-background.png")} resizeMode="cover" style={styles.background}>
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back" onPress={navigation.goBack} style={styles.headerButton}><ArrowLeft color="#5F3B2B" size={23}/></Pressable>
        <View style={styles.headerCopy}><Text style={styles.kicker}>PDF document</Text><Text numberOfLines={1} style={styles.headerTitle}>{title}</Text></View>
        <Pressable accessibilityLabel="Download PDF" disabled={!url || downloading} onPress={() => void save()} style={styles.headerButton}><Download color={url ? "#70454A" : "rgba(95,59,43,.25)"} size={21}/></Pressable>
      </View>
      <View style={styles.body}>
        {source ? <PdfDocumentView onError={() => { setSource(null); setError("This PDF could not be displayed. Refresh it to download a clean copy."); }} onPageChange={(current,total)=>{setPage(current);setTotalPages(total);}} source={source}/> : <View style={styles.state}><View style={styles.stateIcon}><FileText color="#81545E" size={34} strokeWidth={1.6}/></View><Text style={styles.stateTitle}>{error || "Preparing your document…"}</Text>{error?<Pressable onPress={() => void load(true)} style={styles.retry}><RefreshCw color="#FFF8EE" size={16}/><Text style={styles.retryText}>Refresh PDF</Text></Pressable>:null}</View>}
      </View>
      <View style={styles.footer}><Text style={styles.pageText}>{totalPages ? `Page ${page} of ${totalPages}` : "Pinch to zoom · scroll to read"}</Text><Pressable disabled={!url || downloading} onPress={() => void save()} style={({pressed})=>[styles.downloadButton,pressed&&styles.pressed]}><Download color="#FFF8EE" size={17}/><Text style={styles.downloadText}>{downloading?"Preparing…":"Download PDF"}</Text></Pressable></View>
    </SafeAreaView>
  </ImageBackground></View>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:"#F6E3C5"},background:{flex:1},safe:{flex:1},header:{minHeight:62,flexDirection:"row",alignItems:"center",paddingHorizontal:12,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:"rgba(95,59,43,.10)"},headerButton:{width:44,height:44,alignItems:"center",justifyContent:"center"},headerCopy:{flex:1,alignItems:"center",paddingHorizontal:6},kicker:{color:"#9A5B6A",fontSize:8,fontWeight:"900",letterSpacing:1,textTransform:"uppercase"},headerTitle:{maxWidth:250,marginTop:3,color:"#5F3B2B",fontFamily:sansFont,fontSize:12,fontWeight:"700"},body:{flex:1,marginHorizontal:12,marginTop:12,overflow:"hidden",borderRadius:22,borderWidth:1,borderColor:"rgba(95,59,43,.12)",backgroundColor:"rgba(255,251,244,.76)"},state:{flex:1,alignItems:"center",justifyContent:"center",padding:30},stateIcon:{width:70,height:70,alignItems:"center",justifyContent:"center",borderRadius:24,backgroundColor:"rgba(223,162,177,.20)"},stateTitle:{maxWidth:280,marginTop:16,color:"rgba(95,59,43,.62)",fontSize:13,lineHeight:20,textAlign:"center"},retry:{minHeight:44,marginTop:18,flexDirection:"row",alignItems:"center",gap:8,paddingHorizontal:18,borderRadius:22,backgroundColor:"#70454A"},retryText:{color:"#FFF8EE",fontSize:11,fontWeight:"800"},footer:{minHeight:72,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12,paddingHorizontal:16},pageText:{flex:1,color:"rgba(95,59,43,.48)",fontSize:10,fontWeight:"700"},downloadButton:{minHeight:42,flexDirection:"row",alignItems:"center",gap:8,paddingHorizontal:16,borderRadius:21,backgroundColor:"#70454A"},downloadText:{color:"#FFF8EE",fontSize:11,fontWeight:"800"},pressed:{opacity:.72},
});
