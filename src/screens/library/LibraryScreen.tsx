import React, { useCallback, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { BookOpenText, ChevronRight } from "lucide-react-native";
import { ImageBackground, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { exampleLibraryCourses, type LibraryCourse } from "../../data/libraryCatalog";
import { getLibraryCourses } from "../../services/library/libraryApi";
import { appSansFont as sansFont, screenLayout, typeScale } from "../../theme/typography";

const GRID_GAP = 16;

function Folder({ course, onPress, width }: { course: LibraryCourse; onPress: () => void; width: number }) {
  const chapters = course.modules.reduce((total, module) => total + module.chapters.length, 0);
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.folderWrap,{width}]}>
    <View style={styles.folderTab} />
    <View style={styles.folder}>
      <View style={styles.folderIcon}><BookOpenText color="#795159" size={19} strokeWidth={1.6} /></View>
      <Text style={styles.folderCategory}>{course.category}</Text>
      <View style={styles.folderBottom}><Text numberOfLines={1} style={styles.folderCount}>{course.modules.length} modules · {chapters} chapters</Text><ChevronRight color="#795159" size={16} strokeWidth={1.7} /></View>
    </View>
    <Text numberOfLines={2} style={styles.courseName}>{course.title}</Text>
  </Pressable>;
}

export default function LibraryScreen() {
  const navigation = useNavigation<any>();
  const { width: screenWidth } = useWindowDimensions();
  const columnWidth = Math.floor((screenWidth - (screenLayout.horizontalPadding * 2) - GRID_GAP) / 2);
  const [courses, setCourses] = useState<LibraryCourse[]>(exampleLibraryCourses);
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async (spinner = false) => { if (spinner) setRefreshing(true); const controller = new AbortController(); try { const remote = await getLibraryCourses(controller.signal); if (remote.length) setCourses(remote); } catch {} finally { if (spinner) setRefreshing(false); } }, []);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  return <View style={styles.root}><ImageBackground source={require("../../../assets/welcome/paper-background.png")} resizeMode="cover" style={styles.background}>
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh(true)} tintColor="#70454A" />} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><View style={styles.headerIcon}><BookOpenText color="#70454A" size={23} strokeWidth={1.8} /></View><View><Text style={styles.kicker}>Learn gently</Text><Text style={styles.title}>Library</Text></View></View>
        <Text style={styles.subtitle}>Choose a collection and begin wherever feels right.</Text>
        <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Your modules</Text><Text style={styles.count}>{courses.length}</Text></View>
        <View style={styles.grid}>{courses.map((course) => <Folder course={course} key={course.id} onPress={() => navigation.navigate("Course", { courseId: course.id })} width={columnWidth} />)}</View>
      </ScrollView>
    </SafeAreaView>
  </ImageBackground></View>;
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:"#F6E3C5"},background:{flex:1},safe:{flex:1},content:{paddingHorizontal:screenLayout.horizontalPadding,paddingTop:24,paddingBottom:140},
  header:{flexDirection:"row",alignItems:"center",gap:13},headerIcon:{width:48,height:48,alignItems:"center",justifyContent:"center",borderRadius:17,borderWidth:1,borderColor:"rgba(112,69,74,.13)",backgroundColor:"rgba(255,249,239,.62)"},
  kicker:{color:"#9A5B6A",fontFamily:sansFont,fontSize:typeScale.screenKicker,fontWeight:"800",letterSpacing:1.5,textTransform:"uppercase"},title:{marginTop:1,color:"#5F3B2B",fontSize:typeScale.screenTitle,lineHeight:typeScale.screenTitleLine,fontWeight:"600"},
  subtitle:{maxWidth:310,marginTop:17,color:"rgba(95,59,43,.60)",fontFamily:sansFont,fontSize:14,lineHeight:21},sectionRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:34,marginBottom:18},sectionTitle:{color:"#5F3B2B",fontSize:22,fontWeight:"700"},count:{minWidth:28,height:28,overflow:"hidden",borderRadius:14,color:"#70454A",backgroundColor:"rgba(223,162,177,.23)",fontSize:11,lineHeight:28,fontWeight:"800",textAlign:"center"},
  grid:{flexDirection:"row",flexWrap:"wrap",gap:GRID_GAP},folderWrap:{minWidth:0,maxWidth:"100%",flexGrow:0,flexShrink:0,marginBottom:14,overflow:"hidden"},folderTab:{width:"42%",height:12,marginLeft:1,marginBottom:-2,borderTopLeftRadius:9,borderTopRightRadius:9,backgroundColor:"#D9BCBE"},folder:{width:"100%",height:124,overflow:"hidden",padding:14,borderRadius:17,borderTopLeftRadius:4,borderWidth:1,borderColor:"rgba(121,81,89,.10)",backgroundColor:"#EAD5D4"},folderIcon:{width:32,height:32,alignItems:"center",justifyContent:"center",borderRadius:16,borderWidth:1,borderColor:"rgba(121,81,89,.18)"},folderCategory:{marginTop:12,color:"#795159",fontSize:9,fontWeight:"800",letterSpacing:1,textTransform:"uppercase"},folderBottom:{flexDirection:"row",alignItems:"center",marginTop:"auto"},folderCount:{minWidth:0,flex:1,color:"rgba(95,59,43,.52)",fontSize:9,fontWeight:"600"},courseName:{width:"100%",minWidth:0,marginTop:10,color:"#5F3B2B",fontSize:15,lineHeight:20,fontWeight:"700"},pressed:{opacity:.78,transform:[{scale:.985}]},
});
