import React, { useCallback, useMemo, useRef, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Activity, Baby, Brain, BrainCircuit, ChevronLeft, ChevronRight, Dumbbell, Ear, Flower2, Footprints, Headphones, Heart, Pause, PersonStanding, Play, Search, Sparkles, Wind, X } from "lucide-react-native";
import { ImageBackground, type ImageSourcePropType, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassContainer, GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { exerciseCatalog, exerciseCategories, type ExerciseCatalogItem, type ExerciseCategory } from "../../data/exerciseCatalog";
import { getExerciseCatalog, type BackendExerciseCatalogItem } from "../../services/exercises/exerciseCatalogApi";
import { useAudioPlayerController } from "../../context/AudioPlayerContext";
import { useAuth } from "../../context/AuthContext";
import { getFavoriteExerciseIds, subscribeToFavoriteExercises } from "../../services/wellness/wellnessApi";
import { appSansFont as sansFont, screenLayout, typeScale } from "../../theme/typography";

type LibraryKind = "somatic" | "audio";
type Collection = "All" | "Favorites" | ExerciseCategory;
type CatalogItem = ExerciseCatalogItem & { imageUrl?: string | null; audioUrl?: string | null; audioDurationSeconds?: number | null };

const GRID_GAP = 16;
const CATEGORY_COVERS: Record<ExerciseCategory, ImageSourcePropType> = {
  "Nervous System Reset": require("../../../assets/explore/nervous-system.png"),
  Breathwork: require("../../../assets/explore/breathwork.png"),
  "Whole Body": require("../../../assets/explore/wholebody.png"),
  "Hip & Pelvic": require("../../../assets/explore/hip-pelvic.png"),
  "Spine & Core": require("../../../assets/explore/spine-core.png"),
  "Upper Body": require("../../../assets/explore/upperbody.png"),
  "Sensory Regulation": require("../../../assets/explore/sensory-regulation.png"),
  "Ancient Practices": require("../../../assets/explore/ancient-practices.png"),
  "Kundalini Yoga": require("../../../assets/explore/kulandalini-yoga.png"),
  "For Children": require("../../../assets/explore/for-children.png"),
  "Headache Relief": require("../../../assets/explore/headache-relief.png"),
};

const guidanceLabels: Record<ExerciseCatalogItem["guidanceType"], string> = {
  breathing: "Breathing guide",
  video: "Movement video",
  guided: "Guided practice",
  grounding: "Grounding practice",
  audio: "Audio guide",
};

function FolderCategoryIcon({ category, color }: { category: ExerciseCategory; color: string }) {
  const props = { color, size: 16, strokeWidth: 1.8 };
  switch (category) {
    case "Nervous System Reset": return <BrainCircuit {...props} />;
    case "Breathwork": return <Wind {...props} />;
    case "Whole Body": return <Footprints {...props} />;
    case "Hip & Pelvic": return <Activity {...props} />;
    case "Spine & Core": return <PersonStanding {...props} />;
    case "Upper Body": return <Dumbbell {...props} />;
    case "Sensory Regulation": return <Ear {...props} />;
    case "Ancient Practices": return <Sparkles {...props} />;
    case "Kundalini Yoga": return <Flower2 {...props} />;
    case "For Children": return <Baby {...props} />;
    case "Headache Relief": return <Brain {...props} />;
  }
}

function CategoryCard({ category, count, kind, onPress, supportsGlass, width }: { category: ExerciseCategory; count: number; kind: LibraryKind; onPress: () => void; supportsGlass: boolean; width: number }) {
  const noun = kind === "audio" ? (count === 1 ? "recording" : "recordings") : (count === 1 ? "exercise" : "exercises");
  const fixedWidth = { width, minWidth: width, maxWidth: width, flexBasis: width };
  const overlayContent = <View className="h-full justify-center px-3.5 py-2.5">
    <Text numberOfLines={2} style={styles.categoryName}>{category}</Text>
    <View className="mt-2 flex-row items-center gap-1.5">
      <FolderCategoryIcon category={category} color="#865B61" />
      <Text numberOfLines={1} style={styles.categoryCount}>{count} {noun}</Text>
      <View className="ml-auto h-8 w-8 items-center justify-center rounded-full bg-[#8F625F]">
        <ChevronRight color="#FFF8EE" size={18} strokeWidth={2} />
      </View>
    </View>
  </View>;
  return <Pressable accessibilityLabel={`Open ${category}, ${count} ${noun}`} accessibilityRole="button" className="h-[210px] overflow-hidden rounded-[22px] border active:opacity-80" onPress={onPress} style={[fixedWidth, styles.categoryCard]}>
    <ImageBackground className="h-full w-full justify-end" resizeMode="cover" source={CATEGORY_COVERS[category]}>
      {supportsGlass ? <GlassView glassEffectStyle="regular" style={styles.categoryOverlayGlass} tintColor="#EAD5D4">{overlayContent}</GlassView> : <View style={styles.categoryOverlayFallback}>{overlayContent}</View>}
    </ImageBackground>
  </Pressable>;
}

export default function ExploreScreen() {
  const navigation = useNavigation<any>();
  const { runAuthenticated } = useAuth();
  const audioPlayer = useAudioPlayerController();
  const scrollRef = useRef<ScrollView>(null);
  const { width: screenWidth } = useWindowDimensions();
  const columnWidth = Math.floor((screenWidth - (screenLayout.horizontalPadding * 2) - GRID_GAP) / 2);
  const [library, setLibrary] = useState<LibraryKind>("somatic");
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Collection>("All");
  const [catalog, setCatalog] = useState<CatalogItem[]>(exerciseCatalog);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const supportsLiquidGlass = Platform.OS === "ios" && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  const selectedLibraryColor = supportsLiquidGlass ? "#5F3B2B" : "#FFF8EE";

  const refreshCatalog = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    const controller = new AbortController();
    try {
      const items: BackendExerciseCatalogItem[] = await getExerciseCatalog(controller.signal);
      if (items.length > 0) setCatalog(items);
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") console.warn("Using bundled exercise catalog fallback", error);
    } finally {
      if (showSpinner) setIsRefreshing(false);
    }
  }, []);

  const refreshFavorites = useCallback(async () => {
    try {
      const ids = await runAuthenticated(getFavoriteExerciseIds);
      setFavoriteIds(new Set(ids));
    } catch (error) {
      console.warn("Unable to load favorite exercises", error);
    }
  }, [runAuthenticated]);

  useFocusEffect(useCallback(() => {
    refreshCatalog();
    void refreshFavorites();
    const unsubscribe = subscribeToFavoriteExercises(({ exerciseId, favorite }) => {
      setFavoriteIds((current) => {
        const next = new Set(current);
        if (favorite) next.add(exerciseId); else next.delete(exerciseId);
        return next;
      });
    });
    const interval = setInterval(() => refreshCatalog(), 3_000);
    return () => { clearInterval(interval); unsubscribe(); };
  }, [refreshCatalog, refreshFavorites]));

  const libraryExercises = useMemo(() => catalog.filter((exercise) => library === "audio" ? exercise.guidanceType === "audio" : exercise.guidanceType !== "audio"), [catalog, library]);
  const categoryFolders = useMemo(() => exerciseCategories
    .filter((category): category is ExerciseCategory => category !== "All")
    .map((category) => ({ category, count: libraryExercises.filter((exercise) => exercise.category === category).length }))
    .filter((folder) => folder.count > 0), [libraryExercises]);
  const categoryRows = useMemo(() => Array.from({ length: Math.ceil(categoryFolders.length / 2) }, (_, rowIndex) => categoryFolders.slice(rowIndex * 2, (rowIndex * 2) + 2)), [categoryFolders]);

  const visibleExercises = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery) return libraryExercises.filter((exercise) => exercise.title.toLowerCase().includes(normalizedQuery) || exercise.category.toLowerCase().includes(normalizedQuery));
    if (selectedCategory === "All") return [];
    if (selectedCategory === "Favorites") return libraryExercises.filter((exercise) => favoriteIds.has(exercise.exerciseId ?? exercise.id));
    return libraryExercises.filter((exercise) => exercise.category === selectedCategory);
  }, [favoriteIds, libraryExercises, query, selectedCategory]);

  const chooseLibrary = (next: LibraryKind) => {
    setLibrary(next); setSelectedCategory("All"); setQuery("");
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (next === "audio") refreshCatalog();
  };

  const chooseCategory = (category: Collection) => {
    setSelectedCategory(category);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
  };

  const openExercise = (exercise: CatalogItem) => {
    if (exercise.guidanceType === "audio" && exercise.audioUrl) {
      if (audioPlayer.track?.id !== exercise.id) audioPlayer.playTrack({ id: exercise.id, title: exercise.title, category: exercise.category, audioUrl: exercise.audioUrl, imageUrl: exercise.imageUrl, durationSeconds: exercise.audioDurationSeconds }).catch((error) => console.warn("Unable to play audio", error));
      navigation.navigate("AudioPlayer");
      return;
    }
    navigation.navigate("Exercise", { exerciseId: exercise.exerciseId ?? exercise.id, catalogId: exercise.id });
  };

  const renderExercise = (item: CatalogItem) => {
    const isAudio = item.guidanceType === "audio";
    const hasPlayableAudio = isAudio && Boolean(item.audioUrl);
    const isCurrentAudio = isAudio && audioPlayer.track?.id === item.id;
    return <Pressable accessibilityLabel={item.title} accessibilityRole="button" key={item.id} onPress={() => openExercise(item)} style={styles.exercisePressable}>
      <View style={styles.exerciseCard}>
        <View pointerEvents="none" style={styles.exerciseGlassHighlight} />
        <View style={styles.exerciseCopy}>
          <Text numberOfLines={2} style={styles.exerciseTitle}>{item.title}</Text>
          <Text numberOfLines={1} style={styles.exerciseMeta}>{isAudio ? `${item.audioDurationSeconds ? `${Math.max(1, Math.round(item.audioDurationSeconds / 60))} min` : "Audio practice"} · Holistic Mind` : `${guidanceLabels[item.guidanceType]} · p. ${item.sourcePage}`}</Text>
        </View>
        <View style={styles.exerciseAction}>{favoriteIds.has(item.exerciseId ?? item.id) ? <Heart color="#9A5B6A" fill="#DFA2B1" size={17} strokeWidth={1.8} /> : hasPlayableAudio ? <View style={[styles.audioPlayIcon, isCurrentAudio && styles.audioPlayIconActive]}>{isCurrentAudio && audioPlayer.playing ? <Pause color="#FFF8EE" fill="#FFF8EE" size={15} /> : <Play color={isCurrentAudio ? "#FFF8EE" : "#673F3F"} fill={isCurrentAudio ? "#FFF8EE" : "#673F3F"} size={15} />}</View> : <ChevronRight color="rgba(95,59,43,0.40)" size={20} strokeWidth={2} />}</View>
      </View>
    </Pressable>;
  };

  const isSearching = Boolean(query.trim());
  const isFolderOverview = selectedCategory === "All" && !isSearching;

  return <View collapsable={false} style={styles.root}><ImageBackground {...({ collapsable: false } as any)} source={require("../../../assets/welcome/paper-background.png")} resizeMode="cover" style={styles.background}>
    <SafeAreaView collapsable={false} edges={["top"]} style={styles.safeArea}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => refreshCatalog(true)} tintColor="#673F3F" />} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.titleRow}><View><Text style={styles.kicker}>Wellness library</Text><Text style={styles.title}>Explore</Text></View><Text style={styles.count}>{libraryExercises.length} {library === "audio" ? "recordings" : "exercises"}</Text></View>
          <GlassContainer spacing={8} style={[styles.libraryTabs, supportsLiquidGlass && styles.libraryTabsLiquid]}>
            <Pressable onPress={() => chooseLibrary("somatic")} style={[styles.libraryTab, library === "somatic" && !supportsLiquidGlass && styles.libraryTabSelected]}>
              {supportsLiquidGlass ? <GlassView glassEffectStyle={library === "somatic" ? "regular" : "clear"} isInteractive style={styles.libraryTabSurface} tintColor={library === "somatic" ? "#EABFC2" : undefined}><Activity color={library === "somatic" ? selectedLibraryColor : "#673F3F"} size={18} /><Text style={styles.libraryTabText}>Somatic exercises</Text></GlassView> : <View style={styles.libraryTabSurface}><Activity color={library === "somatic" ? selectedLibraryColor : "#673F3F"} size={18} /><Text style={[styles.libraryTabText, library === "somatic" && styles.libraryTabTextSelected]}>Somatic exercises</Text></View>}
            </Pressable>
            <Pressable onPress={() => chooseLibrary("audio")} style={[styles.libraryTab, library === "audio" && !supportsLiquidGlass && styles.libraryTabSelected]}>
              {supportsLiquidGlass ? <GlassView glassEffectStyle={library === "audio" ? "regular" : "clear"} isInteractive style={styles.libraryTabSurface} tintColor={library === "audio" ? "#EABFC2" : undefined}><Headphones color={library === "audio" ? selectedLibraryColor : "#673F3F"} size={18} /><Text style={styles.libraryTabText}>Audio library</Text></GlassView> : <View style={styles.libraryTabSurface}><Headphones color={library === "audio" ? selectedLibraryColor : "#673F3F"} size={18} /><Text style={[styles.libraryTabText, library === "audio" && styles.libraryTabTextSelected]}>Audio library</Text></View>}
            </Pressable>
          </GlassContainer>
          <View style={styles.searchField}><Search color="rgba(95,59,43,0.48)" size={20} strokeWidth={2} /><TextInput autoCapitalize="none" autoCorrect={false} onChangeText={setQuery} placeholder={library === "audio" ? "Search audio" : "Search all exercises"} placeholderTextColor="rgba(95,59,43,0.38)" returnKeyType="search" style={styles.searchInput} value={query} />{query ? <Pressable accessibilityLabel="Clear search" accessibilityRole="button" hitSlop={8} onPress={() => setQuery("")} style={styles.clearButton}><X color="rgba(95,59,43,0.60)" size={17} strokeWidth={2.2} /></Pressable> : null}</View>
        </View>

        {isFolderOverview ? <>
          <View style={styles.sectionRow}><View><Text style={styles.sectionKicker}>{library === "audio" ? "Listen gently" : "Choose a focus"}</Text><Text style={styles.sectionTitle}>{library === "audio" ? "Audio collections" : "Exercise categories"}</Text></View><Text style={styles.sectionCount}>{categoryFolders.length}</Text></View>
          {library === "somatic" ? <Pressable accessibilityLabel={`Open favorites, ${favoriteIds.size} saved`} accessibilityRole="button" className="relative mb-5 min-h-[86px] flex-row items-center gap-4 overflow-hidden rounded-[23px] border px-[18px] py-[14px] active:opacity-75" onPress={() => chooseCategory("Favorites")} style={{ marginHorizontal: screenLayout.horizontalPadding, borderColor: "rgba(121,81,89,.12)", backgroundColor: "rgba(255,249,242,.72)", shadowColor: "#5F3B2B", shadowOpacity: .05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }}><View className="absolute -bottom-14 -right-5 h-32 w-32 rounded-full bg-[#EAD5D4]/40" pointerEvents="none" /><View className="h-12 w-12 items-center justify-center rounded-full bg-[#EAD5D4]/70"><Heart color="#8D5361" size={24} strokeWidth={1.8}/></View><View className="min-w-0 flex-1"><Text style={styles.favoritesTitle}>Your favorites</Text><Text style={styles.favoritesMeta}>{favoriteIds.size} saved {favoriteIds.size === 1 ? "exercise" : "exercises"}</Text></View><View className="h-10 w-7 items-end justify-center"><ChevronRight color="#795159" size={21} strokeWidth={1.8}/></View></Pressable> : null}
          {categoryFolders.length ? <View className="gap-[18px]" style={{ paddingHorizontal: screenLayout.horizontalPadding }}>{categoryRows.map((row) => <View className="flex-row gap-4" key={row[0].category}>{row.map((folder) => <CategoryCard category={folder.category} count={folder.count} key={folder.category} kind={library} onPress={() => chooseCategory(folder.category)} supportsGlass={supportsLiquidGlass} width={columnWidth} />)}{row.length === 1 ? <View pointerEvents="none" style={{ width: columnWidth }} /> : null}</View>)}</View> : <View style={styles.emptyState}><Text style={styles.emptyTitle}>No collections yet</Text><Text style={styles.emptyText}>Published content will appear here automatically.</Text></View>}
        </> : <View style={styles.listSection}>
          {isSearching ? <View style={styles.listHeading}><View><Text style={styles.sectionKicker}>Across all categories</Text><Text style={styles.listTitle}>Search results</Text></View><Text style={styles.sectionCount}>{visibleExercises.length}</Text></View> : <View style={styles.categoryHeading}><Pressable accessibilityLabel="Back to categories" accessibilityRole="button" onPress={() => chooseCategory("All")} style={styles.backButton}><ChevronLeft color="#673F3F" size={22} strokeWidth={2} /></Pressable><View style={styles.categoryHeadingCopy}><Text style={styles.sectionKicker}>{library === "audio" ? "Audio collection" : "Exercise category"}</Text><Text style={styles.listTitle}>{selectedCategory}</Text></View><Text style={styles.sectionCount}>{visibleExercises.length}</Text></View>}
          {visibleExercises.length ? <View style={styles.exerciseList}>{visibleExercises.map(renderExercise)}</View> : <View style={styles.emptyState}><Text style={styles.emptyTitle}>{selectedCategory === "Favorites" ? "No favorites yet" : "Nothing found"}</Text><Text style={styles.emptyText}>{selectedCategory === "Favorites" ? "Tap the heart on an exercise to keep it here." : "Try another exercise name or category."}</Text></View>}
        </View>}
      </ScrollView>
    </SafeAreaView>
  </ImageBackground></View>;
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:"#F7E9D4"},background:{flex:1},safeArea:{flex:1},content:{paddingBottom:132},header:{paddingHorizontal:screenLayout.horizontalPadding,paddingTop:screenLayout.topPadding},
  titleRow:{flexDirection:"row",alignItems:"flex-end",justifyContent:"space-between",gap:16},kicker:{color:"rgba(95,59,43,0.58)",fontFamily:sansFont,fontSize:typeScale.screenKicker,fontWeight:"700",letterSpacing:.8,textTransform:"uppercase"},title:{marginTop:3,color:"#5F3B2B",fontFamily:sansFont,fontSize:typeScale.screenTitle,lineHeight:typeScale.screenTitleLine,fontWeight:"700"},count:{paddingBottom:5,color:"rgba(95,59,43,0.58)",fontFamily:sansFont,fontSize:typeScale.control,fontWeight:"600"},
  libraryTabs:{flexDirection:"row",gap:8,marginTop:20,padding:4,borderRadius:22,backgroundColor:"rgba(255,255,255,.46)"},libraryTabsLiquid:{padding:0,backgroundColor:"transparent"},libraryTab:{minHeight:46,flex:1,borderRadius:18},libraryTabSurface:{width:"100%",minHeight:46,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7,borderRadius:18},libraryTabSelected:{backgroundColor:"#673F3F"},libraryTabText:{color:"#673F3F",fontFamily:sansFont,fontSize:typeScale.control,fontWeight:"700"},libraryTabTextSelected:{color:"#FFF8EE"},
  searchField:{height:52,marginTop:20,overflow:"hidden",flexDirection:"row",alignItems:"center",gap:10,paddingHorizontal:15,borderRadius:19,borderWidth:1,borderColor:"rgba(255,255,255,0.70)",backgroundColor:"rgba(255,255,255,0.48)",shadowColor:"#5F3B2B",shadowOpacity:.07,shadowRadius:14,shadowOffset:{width:0,height:7}},searchInput:{height:50,minWidth:0,flex:1,padding:0,color:"#5F3B2B",fontFamily:sansFont,fontSize:15,lineHeight:20,fontWeight:"500",includeFontPadding:false},clearButton:{width:28,height:28,alignItems:"center",justifyContent:"center"},
  sectionRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:32,marginBottom:20,paddingHorizontal:screenLayout.horizontalPadding},sectionKicker:{color:"rgba(95,59,43,.48)",fontFamily:sansFont,fontSize:9,fontWeight:"800",letterSpacing:1,textTransform:"uppercase"},sectionTitle:{marginTop:4,color:"#5F3B2B",fontFamily:sansFont,fontSize:22,lineHeight:27,fontWeight:"700"},sectionCount:{minWidth:28,height:28,overflow:"hidden",borderRadius:14,color:"#70454A",backgroundColor:"rgba(223,162,177,.23)",fontFamily:sansFont,fontSize:11,lineHeight:28,fontWeight:"800",textAlign:"center"},
  favoritesTitle:{color:"#5F3B2B",fontFamily:sansFont,fontSize:16,lineHeight:21,fontWeight:"800"},favoritesMeta:{marginTop:3,color:"rgba(95,59,43,.55)",fontFamily:sansFont,fontSize:11,lineHeight:16,fontWeight:"600"},
  categoryCard:{borderColor:"rgba(95,59,43,.08)",backgroundColor:"#F1DED8",shadowColor:"#5F3B2B",shadowOpacity:.06,shadowRadius:11,shadowOffset:{width:0,height:6}},categoryOverlayGlass:{height:78},categoryOverlayFallback:{height:78,backgroundColor:"rgba(239,219,214,.76)"},categoryName:{maxWidth:"94%",color:"#4B302A",fontFamily:sansFont,fontSize:15,lineHeight:18,fontWeight:"800"},categoryCount:{minWidth:0,flexShrink:1,color:"rgba(75,48,42,.68)",fontFamily:sansFont,fontSize:11,lineHeight:15,fontWeight:"700"},
  listSection:{paddingTop:28},listHeading:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:screenLayout.horizontalPadding,paddingBottom:14},categoryHeading:{flexDirection:"row",alignItems:"center",gap:12,paddingHorizontal:screenLayout.horizontalPadding,paddingBottom:14},categoryHeadingCopy:{minWidth:0,flex:1},backButton:{width:42,height:42,alignItems:"center",justifyContent:"center",borderRadius:21,borderWidth:1,borderColor:"rgba(95,59,43,.10)",backgroundColor:"rgba(255,255,255,.50)"},listTitle:{marginTop:4,color:"#5F3B2B",fontFamily:sansFont,fontSize:22,lineHeight:28,fontWeight:"700"},
  exerciseList:{gap:11,paddingHorizontal:screenLayout.horizontalPadding},exercisePressable:{width:"100%",flexGrow:0,flexShrink:0},exerciseCard:{position:"relative",width:"100%",minHeight:78,overflow:"hidden",flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12,paddingHorizontal:16,paddingVertical:12,borderRadius:19,borderWidth:1,borderColor:"rgba(255,255,255,.78)",backgroundColor:"rgba(255,251,245,.66)",shadowColor:"#5F3B2B",shadowOpacity:.065,shadowRadius:13,shadowOffset:{width:0,height:6}},exerciseGlassHighlight:{position:"absolute",top:0,left:0,right:0,height:34,backgroundColor:"rgba(255,255,255,.20)"},exerciseCopy:{minWidth:0,flexGrow:1,flexShrink:1},exerciseTitle:{color:"#3F302A",fontFamily:sansFont,fontSize:typeScale.itemTitle,lineHeight:typeScale.itemTitleLine,fontWeight:"600"},exerciseMeta:{marginTop:4,color:"rgba(95,59,43,0.52)",fontFamily:sansFont,fontSize:typeScale.meta,fontWeight:"500"},exerciseAction:{width:32,height:36,flexGrow:0,flexShrink:0,alignItems:"center",justifyContent:"center"},audioPlayIcon:{width:32,height:32,alignItems:"center",justifyContent:"center",borderRadius:16,backgroundColor:"rgba(103,63,63,.10)"},audioPlayIconActive:{backgroundColor:"#673F3F"},
  emptyState:{alignItems:"center",paddingHorizontal:30,paddingTop:62},emptyTitle:{color:"#5F3B2B",fontFamily:sansFont,fontSize:17,fontWeight:"700"},emptyText:{marginTop:6,color:"rgba(95,59,43,0.56)",fontFamily:sansFont,fontSize:13,lineHeight:19,fontWeight:"500",textAlign:"center"},
});
