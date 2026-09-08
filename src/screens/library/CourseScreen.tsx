import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ArrowLeft, Check, ChevronDown, ChevronRight, FileText, Folder, FolderOpen, Headphones, ListChecks, MessageCircleQuestion, Video } from "lucide-react-native";
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { exampleLibraryCourses, type LibraryChapter, type LibraryCourse, type LibraryModule } from "../../data/libraryCatalog";
import { getCourseProgress, getLibraryCourse, getLibraryProgress } from "../../services/library/libraryApi";
import { useAuth } from "../../context/AuthContext";
import { appSansFont as sansFont, screenLayout } from "../../theme/typography";

const minutes = (seconds: number | null) => seconds ? `${Math.max(1, Math.round(seconds / 60))} min` : "Short";
const chapterLabel = (chapter: LibraryChapter) => {
  const type = chapter.chapterType ?? chapter.mediaType;
  if (type === "interactive_qna") return "Interactive Q&A";
  if (type === "mcq") return "Quick quiz";
  if (type === "pdf") return "PDF document";
  return `${type} · ${minutes(chapter.durationSeconds)}`;
};
const ChapterIcon = ({ chapter }: { chapter: LibraryChapter }) => {
  const type = chapter.chapterType ?? chapter.mediaType;
  if (type === "interactive_qna") return <MessageCircleQuestion color="#81545E" size={19} strokeWidth={1.7}/>;
  if (type === "mcq") return <ListChecks color="#81545E" size={19} strokeWidth={1.7}/>;
  if (type === "pdf") return <FileText color="#81545E" size={19} strokeWidth={1.7}/>;
  return type === "audio" ? <Headphones color="#81545E" size={19} strokeWidth={1.7}/> : <Video color="#81545E" size={19} strokeWidth={1.7}/>;
};

function ModuleCard({ module, number, expanded, completedChapterIds, onToggle, onOpen }: { module: LibraryModule; number: number; expanded: boolean; completedChapterIds: ReadonlySet<string>; onToggle: () => void; onOpen: (chapter: LibraryChapter) => void }) {
  const chapters = [...module.chapters].sort((a,b) => a.displayOrder-b.displayOrder);
  const completedCount = chapters.filter((chapter) => completedChapterIds.has(chapter.id)).length;
  return <View style={styles.moduleCard}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onToggle} style={styles.moduleHeader}>
      <View style={styles.folderIcon}>{expanded?<FolderOpen color="#70454A" size={21} strokeWidth={1.7}/>:<Folder color="#70454A" size={21} strokeWidth={1.7}/>}</View>
      <View style={styles.moduleCopy}><Text style={styles.moduleLabel}>Module {number}</Text><Text style={styles.moduleTitle}>{module.title}</Text><Text style={styles.moduleMeta}>{completedCount} of {chapters.length} complete</Text></View>
      <View style={styles.dropdown}><ChevronDown color="#673F3F" size={21} strokeWidth={2} style={{ transform:[{rotate:expanded?"180deg":"0deg"}] }}/></View>
    </Pressable>
    {expanded ? <View style={styles.chapterList}>{chapters.map((chapter,index) => <Pressable key={chapter.id} onPress={() => onOpen(chapter)} style={styles.chapterRow}>
      <View style={[styles.mediaIcon,completedChapterIds.has(chapter.id)&&styles.mediaIconComplete]}>{completedChapterIds.has(chapter.id)?<Check color="#FFF8EE" size={18} strokeWidth={2.2}/>:<ChapterIcon chapter={chapter}/>}</View>
      <View style={styles.chapterCopy}><Text numberOfLines={2} style={styles.chapterTitle}>{index+1}. {chapter.title}</Text><Text style={styles.chapterMeta}>{chapterLabel(chapter)}</Text></View><ChevronRight color="rgba(95,59,43,.35)" size={18} />
    </Pressable>)}</View> : null}
  </View>;
}

export default function CourseScreen({navigation,route}:{navigation:any;route:{params?:{courseId?:string}}}) {
  const { runAuthenticated } = useAuth();
  const courseId=route.params?.courseId;
  const fallback=useMemo(()=>exampleLibraryCourses.find(c=>c.id===courseId)??null,[courseId]);
  const [course,setCourse]=useState<LibraryCourse|null>(fallback);
  const [expandedModuleId,setExpandedModuleId]=useState<string|null>(null);
  const [completedChapterIds,setCompletedChapterIds]=useState<Set<string>>(new Set());
  useFocusEffect(useCallback(()=>{if(!courseId)return;const controller=new AbortController();getLibraryCourse(courseId,controller.signal).then(setCourse).catch(()=>undefined);runAuthenticated(getLibraryProgress).then((value)=>setCompletedChapterIds(new Set(value.completedChapterIds))).catch(()=>undefined);return()=>controller.abort();},[courseId,runAuthenticated]));
  const modules=useMemo(()=>[...(course?.modules??[])].sort((a,b)=>a.displayOrder-b.displayOrder),[course]);
  const chapterCount=modules.reduce((sum,module)=>sum+module.chapters.length,0);
  const progress=useMemo(()=>course?getCourseProgress(course,completedChapterIds):{completed:0,total:0,percent:0},[completedChapterIds,course]);
  const open=(chapter:LibraryChapter)=>navigation.navigate("LibraryModule",{courseId:chapter.courseId,moduleId:chapter.id});
  if(!course)return <SafeAreaView style={styles.missing}><Text style={styles.missingTitle}>Course not found</Text></SafeAreaView>;
  return <View style={styles.root}><ImageBackground source={require("../../../assets/welcome/paper-background.png")} resizeMode="cover" style={styles.background}><SafeAreaView edges={["top"]} style={styles.safe}>
    <View style={styles.topBar}><Pressable accessibilityLabel="Back to library" onPress={navigation.goBack} style={styles.back}><ArrowLeft color="#5F3B2B" size={23}/></Pressable><Text style={styles.topTitle}>Library</Text><View style={styles.back}/></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.category}>{course.category}</Text><Text style={styles.title}>{course.title}</Text>{course.subtitle?<Text style={styles.subtitle}>{course.subtitle}</Text>:null}
      <View style={styles.summary}><Text style={styles.summaryText}>{modules.length} modules</Text><View style={styles.dot}/><Text style={styles.summaryText}>{chapterCount} chapters</Text></View>
      <View style={styles.courseProgress}><View style={styles.progressCopy}><Text style={styles.progressLabel}>Course progress</Text><Text style={styles.progressValue}>{progress.percent}%</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill,{width:`${progress.percent}%`}]}/></View><Text style={styles.progressHint}>{progress.completed} of {progress.total} chapters complete</Text></View>
      <View style={styles.heading}><Text style={styles.headingTitle}>Modules</Text><Text style={styles.headingHint}>Open a module to see its chapters.</Text></View>
      {modules.map((module,index)=><ModuleCard completedChapterIds={completedChapterIds} expanded={expandedModuleId===module.id} key={module.id} module={module} number={index+1} onOpen={open} onToggle={()=>setExpandedModuleId(current=>current===module.id?null:module.id)}/>)}
    </ScrollView>
  </SafeAreaView></ImageBackground></View>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:"#F6E3C5"},background:{flex:1},safe:{flex:1},topBar:{height:58,flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:10},back:{width:44,height:44,alignItems:"center",justifyContent:"center"},topTitle:{color:"rgba(95,59,43,.58)",fontFamily:sansFont,fontSize:12,fontWeight:"800"},content:{paddingHorizontal:screenLayout.horizontalPadding,paddingTop:14,paddingBottom:70},
  category:{color:"#965B68",fontSize:10,fontWeight:"900",letterSpacing:1.1,textTransform:"uppercase"},title:{maxWidth:350,marginTop:8,color:"#5F3B2B",fontSize:30,lineHeight:35,fontWeight:"700"},subtitle:{marginTop:8,color:"rgba(95,59,43,.58)",fontSize:14,lineHeight:20},summary:{flexDirection:"row",alignItems:"center",gap:8,marginTop:16},summaryText:{color:"rgba(95,59,43,.48)",fontSize:10,fontWeight:"700"},dot:{width:3,height:3,borderRadius:2,backgroundColor:"rgba(95,59,43,.30)"},courseProgress:{marginTop:22,padding:17,borderRadius:19,borderWidth:1,borderColor:"rgba(95,59,43,.10)",backgroundColor:"rgba(255,251,244,.58)"},progressCopy:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},progressLabel:{color:"#70454A",fontSize:11,fontWeight:"800"},progressValue:{color:"#70454A",fontSize:18,fontWeight:"800"},progressTrack:{height:7,overflow:"hidden",marginTop:12,borderRadius:4,backgroundColor:"rgba(95,59,43,.12)"},progressFill:{height:"100%",borderRadius:4,backgroundColor:"#9A5B6A"},progressHint:{marginTop:8,color:"rgba(95,59,43,.46)",fontSize:9,fontWeight:"700"},heading:{marginTop:34,marginBottom:15},headingTitle:{color:"#5F3B2B",fontSize:24,fontWeight:"700"},headingHint:{marginTop:4,color:"rgba(95,59,43,.48)",fontSize:11},
  moduleCard:{overflow:"hidden",marginBottom:18,borderRadius:20,borderWidth:1,borderColor:"rgba(95,59,43,.10)",backgroundColor:"rgba(255,251,244,.72)",shadowColor:"#5F3B2B",shadowOpacity:.045,shadowRadius:12,shadowOffset:{width:0,height:6}},moduleHeader:{width:"100%",minHeight:92,flexDirection:"row",alignItems:"center",paddingHorizontal:18,paddingVertical:17},folderIcon:{width:38,height:38,flexShrink:0,alignItems:"center",justifyContent:"center",borderRadius:19,borderWidth:1,borderColor:"rgba(112,69,74,.18)",backgroundColor:"transparent"},moduleCopy:{minWidth:0,flex:1,marginLeft:14},moduleLabel:{color:"rgba(95,59,43,.48)",fontSize:9,fontWeight:"800",letterSpacing:.9,textTransform:"uppercase"},moduleTitle:{marginTop:4,color:"#5F3B2B",fontSize:16,lineHeight:21,fontWeight:"800"},moduleMeta:{marginTop:5,color:"rgba(95,59,43,.44)",fontSize:10,fontWeight:"600"},dropdown:{width:36,height:40,flexShrink:0,marginLeft:12,alignItems:"flex-end",justifyContent:"center",backgroundColor:"transparent"},chapterList:{paddingHorizontal:18,paddingBottom:8,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:"rgba(95,59,43,.10)",backgroundColor:"rgba(255,255,255,.20)"},chapterRow:{width:"100%",minHeight:78,flexDirection:"row",alignItems:"center",paddingVertical:14,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:"rgba(95,59,43,.10)"},mediaIcon:{width:36,height:36,flexShrink:0,alignItems:"center",justifyContent:"center",borderRadius:18,borderWidth:1,borderColor:"rgba(129,84,94,.16)",backgroundColor:"transparent"},mediaIconComplete:{borderColor:"#70856E",backgroundColor:"#70856E"},chapterCopy:{minWidth:0,flex:1,marginLeft:13,marginRight:10},chapterTitle:{color:"#5F3B2B",fontSize:14,lineHeight:20,fontWeight:"700"},chapterMeta:{marginTop:5,color:"rgba(95,59,43,.43)",fontSize:10,fontWeight:"600"},pressed:{opacity:.68},missing:{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:"#F6E3C5"},missingTitle:{color:"#5F3B2B",fontSize:22,fontWeight:"700"},
});
