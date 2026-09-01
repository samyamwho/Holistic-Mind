import React, { useEffect, useMemo, useState } from "react";
import { useVideoPlayer, VideoView } from "expo-video";
import { ArrowLeft, ArrowRight, Check, Clock3, Headphones, ListChecks, MessageCircleQuestion, Play, Video, X } from "lucide-react-native";
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAudioPlayerController } from "../../context/AudioPlayerContext";
import { exampleLibraryCourses, type LibraryChapter, type LibraryCourse } from "../../data/libraryCatalog";
import { getLibraryCourse } from "../../services/library/libraryApi";
import { appSansFont as sansFont, screenLayout } from "../../theme/typography";

function ModuleVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url, (created) => { created.loop = false; });
  return <VideoView allowsFullscreen contentFit="contain" nativeControls player={player} style={styles.video} />;
}

function InteractiveChapter({ chapter }: { chapter: LibraryChapter }) {
  const [answerVisible,setAnswerVisible]=useState(false);
  const [selectedOption,setSelectedOption]=useState<number|null>(null);
  useEffect(()=>{setAnswerVisible(false);setSelectedOption(null);},[chapter.id]);
  const content=chapter.interactiveContent??{};
  if(chapter.chapterType==="interactive_qna") return <View style={styles.interactiveCard}>
    <View style={styles.interactiveHeading}><MessageCircleQuestion color="#70454A" size={21} strokeWidth={1.7}/><Text style={styles.interactiveLabel}>Reflection question</Text></View>
    <Text style={styles.question}>{content.question||"Pause and reflect on what you have learned."}</Text>
    <Pressable onPress={()=>setAnswerVisible(value=>!value)} style={styles.revealButton}><Text style={styles.revealText}>{answerVisible?"Hide guidance":"Reveal guidance"}</Text><ArrowRight color="#70454A" size={17}/></Pressable>
    {answerVisible?<View style={styles.answerBox}><Text style={styles.answerLabel}>Guidance</Text><Text style={styles.answerText}>{content.answer||"Take a moment to notice what comes up for you."}</Text></View>:null}
  </View>;
  const options=Array.isArray(content.options)?content.options:[];
  const correct=typeof content.correctOptionIndex==="number"?content.correctOptionIndex:0;
  return <View style={styles.interactiveCard}>
    <View style={styles.interactiveHeading}><ListChecks color="#70454A" size={21} strokeWidth={1.7}/><Text style={styles.interactiveLabel}>Quick check</Text></View>
    <Text style={styles.question}>{content.question||"Choose the best answer."}</Text>
    <View style={styles.options}>{options.map((option,index)=>{const chosen=selectedOption===index;const checked=selectedOption!==null;const correctOption=index===correct;return <Pressable key={`${option}-${index}`} onPress={()=>setSelectedOption(index)} style={[styles.option,chosen&&(correctOption?styles.optionCorrect:styles.optionWrong)]}><View style={[styles.optionMarker,chosen&&(correctOption?styles.markerCorrect:styles.markerWrong)]}>{chosen?(correctOption?<Check color="#FFF" size={15}/>:<X color="#FFF" size={15}/>):<Text style={styles.optionLetter}>{String.fromCharCode(65+index)}</Text>}</View><Text style={styles.optionText}>{option}</Text>{checked&&correctOption?<Check color="#54735B" size={18}/>:null}</Pressable>;})}</View>
    {selectedOption!==null?<View style={styles.feedback}><Text style={styles.feedbackTitle}>{selectedOption===correct?"That’s right":"Not quite—try the highlighted idea."}</Text>{content.explanation?<Text style={styles.feedbackText}>{content.explanation}</Text>:null}</View>:null}
  </View>;
}

export default function LibraryModuleScreen({ navigation, route }: { navigation: any; route: { params?: { courseId?: string; moduleId?: string } } }) {
  const courseId = route.params?.courseId;
  const moduleId = route.params?.moduleId;
  const fallback = useMemo(() => exampleLibraryCourses.find((item) => item.id === courseId) ?? null, [courseId]);
  const [course, setCourse] = useState<LibraryCourse | null>(fallback);
  const audioPlayer = useAudioPlayerController();

  useEffect(() => {
    if (!courseId) return;
    const controller = new AbortController();
    getLibraryCourse(courseId, controller.signal).then(setCourse).catch(() => undefined);
    return () => controller.abort();
  }, [courseId]);

  const chapters = useMemo(() => [...(course?.modules ?? [])].sort((a,b)=>a.displayOrder-b.displayOrder).flatMap((module) => [...module.chapters].sort((a,b)=>a.displayOrder-b.displayOrder)), [course]);
  const chapterIndex = chapters.findIndex((item) => item.id === moduleId);
  const module = chapters[chapterIndex];
  const parentModule = course?.modules.find((item) => item.id === module?.moduleId);
  const previous = chapterIndex > 0 ? chapters[chapterIndex - 1] : null;
  const next = chapterIndex >= 0 && chapterIndex < chapters.length - 1 ? chapters[chapterIndex + 1] : null;
  const chapterType=module?.chapterType??module?.mediaType;

  const playAudio = async () => {
    if (!module?.mediaUrl || !course) return;
    await audioPlayer.playTrack({ id: `library-${module.id}`, title: module.title, category: course.title, audioUrl: module.mediaUrl, imageUrl: course.coverImageUrl, durationSeconds: module.durationSeconds });
    navigation.navigate("AudioPlayer");
  };
  const goTo = (target: LibraryChapter) => navigation.replace("LibraryModule", { courseId: target.courseId, moduleId: target.id });

  if (!course || !module) return <SafeAreaView style={styles.missing}><Text style={styles.missingTitle}>Chapter not found</Text><Pressable onPress={navigation.goBack}><Text style={styles.backText}>Go back</Text></Pressable></SafeAreaView>;

  return <View style={styles.root}><ImageBackground source={require("../../../assets/welcome/paper-background.png")} resizeMode="cover" style={styles.background}>
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back to course" onPress={navigation.goBack} style={styles.headerButton}><ArrowLeft color="#5F3B2B" size={23} /></Pressable>
        <View style={styles.headerCopy}><Text style={styles.headerKicker}>Chapter {chapterIndex + 1} of {chapters.length}</Text><Text numberOfLines={1} style={styles.headerTitle}>{course.title}</Text></View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.lessonMetaRow}><View style={styles.typeBadge}>{chapterType === "audio" ? <Headphones color="#7E525D" size={16} /> : chapterType === "interactive_qna" ? <MessageCircleQuestion color="#7E525D" size={16}/> : chapterType === "mcq" ? <ListChecks color="#7E525D" size={16}/> : <Video color="#7E525D" size={16} />}<Text style={styles.typeBadgeText}>{chapterType === "interactive_qna" ? "Q&A" : chapterType === "mcq" ? "Quiz" : chapterType}</Text></View><Text style={styles.classification}>{parentModule?.title}</Text></View>
        <Text style={styles.title}>{module.title}</Text>
        <View style={styles.duration}><Clock3 color="rgba(95,59,43,.46)" size={15} /><Text style={styles.durationText}>{chapterType === "interactive_qna" || chapterType === "mcq" ? "Interactive chapter" : module.durationSeconds ? `${Math.max(1, Math.round(module.durationSeconds / 60))} minutes` : "Short lesson"}</Text></View>

        {chapterType === "interactive_qna" || chapterType === "mcq" ? <InteractiveChapter chapter={module}/> : <View style={styles.mediaCard}>
          {module.mediaType === "video" && module.mediaUrl ? <ModuleVideo url={module.mediaUrl} /> : module.mediaType === "audio" && module.mediaUrl ? <Pressable onPress={() => void playAudio()} style={({ pressed }) => [styles.audioButton, pressed && styles.pressed]}><View style={styles.audioArtwork}><View style={styles.audioOrb} /><Headphones color="#FFF8EE" size={37} strokeWidth={1.7} /></View><View style={styles.audioCopy}><Text style={styles.audioKicker}>Guided audio</Text><Text style={styles.audioLabel}>Listen to this chapter</Text><Text style={styles.audioHint}>Open in the Holistic Mind player</Text></View><View style={styles.playCircle}><Play color="#FFF8EE" fill="#FFF8EE" size={20} /></View></Pressable> : <View style={styles.mediaPlaceholder}><View style={styles.placeholderArtwork}><View style={styles.placeholderOrb} />{module.mediaType === "audio" ? <Headphones color="#FFF8EE" size={38} strokeWidth={1.7} /> : <Video color="#FFF8EE" size={38} strokeWidth={1.7} />}</View><Text style={styles.placeholderKicker}>{module.mediaType} chapter</Text><Text style={styles.placeholderTitle}>Chapter guide</Text><Text style={styles.placeholderText}>Follow the lesson notes below. Attached media will appear here automatically.</Text></View>}
        </View>}

        {module.description ? <View style={styles.lessonCopy}><Text style={styles.aboutLabel}>About this chapter</Text><Text style={styles.description}>{module.description}</Text></View> : null}

        <View style={styles.lessonNavigation}>
          <Pressable disabled={!previous} onPress={() => previous && goTo(previous)} style={({ pressed }) => [styles.navButton, !previous && styles.navButtonDisabled, pressed && previous && styles.pressed]}><ArrowLeft color={previous ? "#673F3F" : "rgba(95,59,43,.24)"} size={18} /><View><Text style={styles.navEyebrow}>Previous chapter</Text><Text numberOfLines={1} style={[styles.navTitle, !previous && styles.navTitleDisabled]}>{previous?.title ?? "First chapter"}</Text></View></Pressable>
          <Pressable disabled={!next} onPress={() => next && goTo(next)} style={({ pressed }) => [styles.navButton, styles.navButtonNext, !next && styles.navButtonDisabled, pressed && next && styles.pressed]}><View style={styles.nextCopy}><Text style={styles.navEyebrow}>Next chapter</Text><Text numberOfLines={1} style={[styles.navTitle, !next && styles.navTitleDisabled]}>{next?.title ?? "Course complete"}</Text></View><ArrowRight color={next ? "#673F3F" : "rgba(95,59,43,.24)"} size={18} /></Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  </ImageBackground></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6E3C5" }, background: { flex: 1 }, safe: { flex: 1 }, header: { minHeight: 62, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(95,59,43,.10)" }, headerButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1, alignItems: "center" }, headerKicker: { color: "#9A5B6A", fontSize: 8, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" }, headerTitle: { maxWidth: 240, marginTop: 3, color: "rgba(95,59,43,.64)", fontFamily: sansFont, fontSize: 11, fontWeight: "700" },
  content: { paddingHorizontal: screenLayout.horizontalPadding, paddingTop: 24, paddingBottom: 50 }, lessonMetaRow: { flexDirection: "row", alignItems: "center", gap: 9 }, typeBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: "rgba(223,162,177,.18)" }, typeBadgeText: { color: "#7E525D", fontSize: 9, fontWeight: "900", textTransform: "uppercase" }, classification: { flex: 1, color: "rgba(95,59,43,.48)", fontSize: 9, fontWeight: "800" },
  title: { maxWidth: 355, marginTop: 16, color: "#5F3B2B", fontSize: 31, lineHeight: 37, fontWeight: "700" }, duration: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 11 }, durationText: { color: "rgba(95,59,43,.50)", fontSize: 10, fontWeight: "700" },
  mediaCard: { overflow: "hidden", minHeight: 240, marginTop: 24, borderRadius: 25, borderWidth: 1, borderColor: "rgba(95,59,43,.10)", backgroundColor: "rgba(255,251,244,.82)" }, video: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#211A18" },
  audioButton: { minHeight: 240, flexDirection: "row", alignItems: "center", gap: 15, padding: 18 }, audioArtwork: { position: "relative", width: 80, height: 118, overflow: "hidden", alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: "#A26C74" }, audioOrb: { position: "absolute", width: 72, height: 72, top: -25, right: -24, borderRadius: 36, backgroundColor: "rgba(246,227,197,.34)" }, audioCopy: { flex: 1 }, audioKicker: { color: "#9A5B6A", fontSize: 9, fontWeight: "900", letterSpacing: .8, textTransform: "uppercase" }, audioLabel: { marginTop: 6, color: "#5F3B2B", fontSize: 16, lineHeight: 21, fontWeight: "800" }, audioHint: { marginTop: 5, color: "rgba(95,59,43,.50)", fontSize: 10, lineHeight: 15 }, playCircle: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "#70454A" },
  mediaPlaceholder: { minHeight: 240, alignItems: "center", justifyContent: "center", padding: 24 }, placeholderArtwork: { position: "relative", width: 70, height: 70, overflow: "hidden", alignItems: "center", justifyContent: "center", borderRadius: 24, backgroundColor: "#A26C74" }, placeholderOrb: { position: "absolute", width: 55, height: 55, top: -18, right: -17, borderRadius: 28, backgroundColor: "rgba(246,227,197,.34)" }, placeholderKicker: { marginTop: 14, color: "#9A5B6A", fontSize: 9, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" }, placeholderTitle: { marginTop: 5, color: "#673F3F", fontSize: 17, fontWeight: "800" }, placeholderText: { maxWidth: 275, marginTop: 7, color: "rgba(95,59,43,.53)", fontSize: 11, lineHeight: 17, textAlign: "center" },
  lessonCopy: { marginTop: 20, padding: 19, borderRadius: 20, backgroundColor: "rgba(255,251,244,.58)" }, aboutLabel: { color: "#9A5B6A", fontSize: 9, fontWeight: "900", letterSpacing: 1.1, textTransform: "uppercase" }, description: { marginTop: 8, color: "rgba(95,59,43,.68)", fontSize: 14, lineHeight: 22 },
  interactiveCard:{marginTop:24,padding:21,borderRadius:22,borderWidth:1,borderColor:"rgba(95,59,43,.11)",backgroundColor:"rgba(255,251,244,.78)"},interactiveHeading:{flexDirection:"row",alignItems:"center",gap:9},interactiveLabel:{color:"#70454A",fontSize:10,fontWeight:"900",letterSpacing:.9,textTransform:"uppercase"},question:{marginTop:20,color:"#5F3B2B",fontSize:20,lineHeight:28,fontWeight:"700"},revealButton:{minHeight:50,marginTop:22,flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:16,borderRadius:16,borderWidth:1,borderColor:"rgba(112,69,74,.18)"},revealText:{color:"#70454A",fontSize:12,fontWeight:"800"},answerBox:{marginTop:14,padding:16,borderRadius:16,backgroundColor:"rgba(183,201,177,.18)"},answerLabel:{color:"#5D715E",fontSize:9,fontWeight:"900",letterSpacing:.8,textTransform:"uppercase"},answerText:{marginTop:7,color:"#4F5548",fontSize:13,lineHeight:20},options:{gap:10,marginTop:20},option:{minHeight:58,flexDirection:"row",alignItems:"center",gap:12,padding:12,borderRadius:16,borderWidth:1,borderColor:"rgba(95,59,43,.11)",backgroundColor:"rgba(255,255,255,.35)"},optionCorrect:{borderColor:"rgba(84,115,91,.38)",backgroundColor:"rgba(183,201,177,.20)"},optionWrong:{borderColor:"rgba(154,91,106,.32)",backgroundColor:"rgba(223,162,177,.14)"},optionMarker:{width:30,height:30,alignItems:"center",justifyContent:"center",borderRadius:15,borderWidth:1,borderColor:"rgba(112,69,74,.18)"},markerCorrect:{borderColor:"#54735B",backgroundColor:"#54735B"},markerWrong:{borderColor:"#9A5B6A",backgroundColor:"#9A5B6A"},optionLetter:{color:"#70454A",fontSize:10,fontWeight:"800"},optionText:{flex:1,color:"#5F3B2B",fontSize:13,lineHeight:19,fontWeight:"600"},feedback:{marginTop:15,paddingTop:15,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:"rgba(95,59,43,.12)"},feedbackTitle:{color:"#5F3B2B",fontSize:13,fontWeight:"800"},feedbackText:{marginTop:6,color:"rgba(95,59,43,.62)",fontSize:12,lineHeight:18},
  lessonNavigation: { gap: 10, marginTop: 25 }, navButton: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 15, borderRadius: 18, borderWidth: 1, borderColor: "rgba(95,59,43,.11)", backgroundColor: "rgba(255,251,244,.68)" }, navButtonNext: { justifyContent: "flex-end" }, navButtonDisabled: { opacity: .52 }, nextCopy: { flex: 1, alignItems: "flex-end" }, navEyebrow: { color: "rgba(95,59,43,.44)", fontSize: 8, fontWeight: "900", letterSpacing: .75, textTransform: "uppercase" }, navTitle: { maxWidth: 270, marginTop: 4, color: "#673F3F", fontSize: 11, fontWeight: "800" }, navTitleDisabled: { color: "rgba(95,59,43,.35)" }, pressed: { opacity: .76 },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F6E3C5" }, missingTitle: { color: "#5F3B2B", fontSize: 22, fontWeight: "700" }, backText: { marginTop: 15, color: "#9A5B6A", fontWeight: "800" },
});
