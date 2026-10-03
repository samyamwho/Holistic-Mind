import Foundation
import AppKit
let out = "reports/images/"
let ink = NSColor(calibratedRed:0.17,green:0.21,blue:0.25,alpha:1)
let blue = NSColor(calibratedRed:0.18,green:0.45,blue:0.71,alpha:1)
let fills = [NSColor(calibratedRed:0.91,green:0.95,blue:0.98,alpha:1), NSColor(calibratedRed:0.92,green:0.96,blue:0.92,alpha:1),NSColor(calibratedRed:0.96,green:0.92,blue:0.93,alpha:1)]
func label(_ t:String,_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ h:CGFloat,_ size:CGFloat=23,_ bold:Bool=false,_ color:NSColor=ink,_ center:Bool=false) {
 let p=NSMutableParagraphStyle(); p.alignment=center ? .center:.left; p.lineSpacing=4
 (t as NSString).draw(in:NSRect(x:x,y:y,width:w,height:h),withAttributes:[.font:bold ? NSFont.boldSystemFont(ofSize:size):NSFont.systemFont(ofSize:size),.foregroundColor:color,.paragraphStyle:p])
}
func box(_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ h:CGFloat,_ title:String,_ detail:String,_ fill:Int=0){
 fills[fill].setFill(); NSBezierPath(roundedRect:NSRect(x:x,y:y,width:w,height:h),xRadius:14,yRadius:14).fill()
 label(title,x+20,y+18,w-40,52,25,true)
 label(detail,x+20,y+65,w-40,h-70,22)
}
func arrow(_ x:CGFloat,_ y:CGFloat,_ a:CGFloat,_ b:CGFloat){
 blue.setStroke();blue.setFill(); let p=NSBezierPath();p.lineWidth=3;p.move(to:NSPoint(x:x,y:y));p.line(to:NSPoint(x:a,y:b));p.stroke()
 let ang=atan2(b-y,a-x);let h=NSBezierPath();h.move(to:NSPoint(x:a,y:b));h.line(to:NSPoint(x:a-14*cos(ang-0.45),y:b-14*sin(ang-0.45)));h.line(to:NSPoint(x:a-14*cos(ang+0.45),y:b-14*sin(ang+0.45)));h.close();h.fill()
}
func canvas(_ file:String,_ title:String,_ sub:String,_ height:CGFloat=720,_ draw:()->Void) throws{
 let im=NSImage(size:NSSize(width:1400,height:height));im.lockFocusFlipped(true)
 NSColor.white.setFill();NSRect(x:0,y:0,width:1400,height:height).fill()
 label(title,35,25,1330,55,32,true,blue)
 label(sub,35,86,1330,58,22)
 draw();im.unlockFocus()
 let rep=NSBitmapImageRep(data:im.tiffRepresentation!)!;try rep.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:out+file+".png"))
}
try canvas("architecture","Holistic Mind | logical service architecture","Source-observed components and journal privacy boundary",800){
 box(40,185,385,170,"Mobile application","Expo React Native\nCheck-in, practice, library\nEncrypt / decrypt journals",1)
 box(535,185,345,170,"Application API","Node.js / Express\nAuthentication and ownership\nContext and media operations")
 box(990,185,370,170,"Administration","React content workspace\nProtected content operations\nSigned uploads",2)
 arrow(425,260,535,260);arrow(990,260,880,260)
 box(40,470,385,170,"Persistent records","PostgreSQL\nStructured wellness data\nJournal ciphertext + metadata")
 box(535,470,345,170,"Recommendation service","Python / FastAPI\nRules + ONNX MiniLM\nNo journal text",1)
 box(990,470,370,170,"Object storage","S3-compatible media\nImages, audio, video, PDFs\nSigned storage operations",2)
 arrow(605,355,220,470);arrow(710,355,710,470);arrow(815,355,1170,470)
 label("Encrypted journal envelopes cross the API boundary. Decryption keys stay on devices or with the user's recovery copy.",40,697,1320,80,22,true)
}
try canvas("journey","Holistic Mind | daily interaction loop","Recommendations support selection while browsing and reflection remain available",690){
 let titles=["Account + onboarding","Daily check-in","Suggested practices","Practice + feedback"]
 let detail=["Access an account\nChoose a support goal","Record current state\nDeclare comfort choices","Read reasons\nChoose or decline","Open or complete\nReport usefulness / discomfort"]
 for i in 0..<4 {let x=CGFloat(35+i*345);box(x,195,310,185,titles[i],detail[i],i%3);if i<3 {arrow(x+310,285,x+343,285)}}
 box(190,465,430,145,"Explore and Library","User-led browsing and structured learning",0)
 box(780,465,430,145,"Private Journal","Unlock locally, write, encrypt, save",1)
 arrow(530,380,405,465);arrow(875,380,995,465)
}
try canvas("ranking","Holistic Mind | constrained recommendation pipeline","Only eligible candidates reach scoring, diversity selection, or fresh-item substitution",760){
 let t=["1. Context","2. Eligibility","3. Evidence","4. Selection"]
 let d=["Check-in + support goal\nComfort constraints\nInteractions + recency\nJournal list is empty","Remove exclusions\nApply known restrictions\nDeduplicate candidates\nAllow short / empty results","Structured rule score R\nCurrent similarity C\nGoal/history score H\nConditional neighbours B","Subtract recency\nAlign primary support\nApply category diversity\nReturn items + reasons"]
 for i in 0..<4 {let x=CGFloat(35+i*345);box(x,175,310,230,t[i],d[i],i%3);if i<3{arrow(x+310,285,x+343,285)}}
 box(95,475,575,165,"Cold start","S = 0.72 R + 0.23 C + 0.05 H\nNo qualifying collaborative neighbourhood",1)
 box(730,475,575,165,"Collaboration active","S = 0.65 R + 0.20 C + 0.05 H + 0.10 B\nMinimum overlap and neighbour thresholds",0)
 label("H uses the onboarding goal in current application requests. It receives no real journal text.",95,680,1210,45,22,true)
}
try canvas("privacy","Holistic Mind | journal encryption boundary","Persistent storage does not require giving the server the journal decryption key",740){
 box(40,175,400,230,"User device","Generate 256-bit key\nFresh 24-byte nonce per encryption\nEncrypt with XChaCha20-Poly1305\nDecrypt only after unlocking",1)
 box(540,175,345,230,"Server boundary","Store ciphertext envelope\nValidate format + ownership\nObserve record metadata\nNo journal decryption",0)
 box(990,175,370,230,"Recommendations","Structured check-in\nComfort choices + support goal\nExercise feedback\nNo journal text or vectors",2)
 arrow(440,285,540,285)
 label("Authenticated envelope",440,415,450,50,22,true,blue,true)
 box(40,495,600,160,"Recovery and key storage","Native SecureStore; web unlocked-session memory\nAdditional devices verify the user's recovery key",1)
 box(735,495,625,160,"Protection limits","Metadata and other wellness inputs remain readable\nLosing every key copy makes history unrecoverable",2)
}
try canvas("data","Holistic Mind | conceptual relationships","Simplified entity groups; detailed columns and constraints remain in backend migrations",790){
 box(40,175,320,145,"User account","Profile + sessions\nServer-owned identity",0)
 box(540,165,390,170,"Wellness context","Onboarding responses\nDaily check-ins\nAccount-specific history",1)
 box(1030,175,330,145,"Journal vault","Encrypted key check\nEncrypted entries + media",2)
 arrow(360,245,540,245); blue.setStroke(); let connection=NSBezierPath();connection.lineWidth=3;connection.move(to:NSPoint(x:200,y:175));connection.line(to:NSPoint(x:200,y:140));connection.line(to:NSPoint(x:1195,y:140));connection.stroke();arrow(1195,140,1195,175)
 label("Both private groups belong to the authenticated user",395,355,840,45,22,true)
 box(40,455,370,185,"Recommendation request","User + check-in context\nOrdered recommendation items\nEvents and explicit feedback",1)
 box(540,455,390,185,"Managed exercise","Description + restrictions\nSupport goals + intended states\nImages, audio, and video",0)
 box(1030,455,330,185,"Learning content","Courses + modules\nChapters and PDFs\nMedia references",2)
 arrow(410,540,540,540)
 label("Each returned recommendation item refers to an exercise. Learning content supports a separate browsing pathway.",40,695,1320,65,22)
}
try canvas("content","Holistic Mind | managed content workflow","Content records and storage references are coordinated through protected application operations",660){
 let t=["Authorised admin","Validate and store","Publish content","Deliver to user"]
 let d=["Edit exercise / curriculum\nSelect media\nRequest a signed upload","API validates fields\nDatabase stores records\nObject storage receives media","Set publication status\nReview recommendation tags\nCheck media references","API returns content\nApp opens practices / modules\nPlayback and PDF viewing"]
 for i in 0..<4 {let x=CGFloat(35+i*345);box(x,185,310,225,t[i],d[i],i%3);if i<3{arrow(x+310,285,x+343,285)}}
 box(180,470,1040,130,"Content promotion between environments","Export / import managed content and referenced assets. Private wellness records are a separate data category.",1)
}
try canvas("timeline","Holistic Mind | development sequence","Qualitative grouping from the documented 15-week development journal",700){
 let items=[("Research and requirements","Define scope, users, and architecture"),("Mobile foundations","Navigation, onboarding, check-in, and reflection"),("Services and persistence","Accounts, database integration, and hosted content"),("Administration and ranking","Content management, recommendations, and feedback"),("Integration and review","Testing, corrections, deployment guidance, documentation")]
 for (i,item) in items.enumerated(){let y=CGFloat(155+i*84);fills[i%3].setFill();NSBezierPath(roundedRect:NSRect(x:40,y:y,width:1320,height:72),xRadius:10,yRadius:10).fill();label(item.0,60,y+18,420,45,24,true);label(item.1,510,y+19,830,42,23)}
 label("Later refinements: device-only journal encryption, explicit comfort preferences, and journal-free evaluation.",40,609,1320,70,22,true)
}
let copies=[("/private/tmp/holistic-mind-oct3-after-rebuild.png","welcome"),("/private/tmp/holistic-audio-alignment.png","library"),("recommender/evaluation/evaluation_results_production_onnx_charts.png","productionchart"),("recommender/evaluation/evaluation_results_comfort_onnx_charts.png","comfortchart")]
for (src,key) in copies {let dest=out+key+".png";if FileManager.default.fileExists(atPath:dest){try FileManager.default.removeItem(atPath:dest)};try FileManager.default.copyItem(atPath:src,toPath:dest)}
print("11 figures ready")
