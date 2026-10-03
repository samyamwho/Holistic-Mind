import Foundation
import AppKit
let fm = FileManager.default
let root = fm.currentDirectoryPath
let dir = root + "/reports/working/docx-package"
try fm.createDirectory(atPath:dir+"/word/_rels",withIntermediateDirectories:true)
try fm.createDirectory(atPath:dir+"/_rels",withIntermediateDirectories:true)
try fm.createDirectory(atPath:dir+"/docProps",withIntermediateDirectories:true)
try fm.createDirectory(atPath:dir+"/word/media",withIntermediateDirectories:true)
func esc(_ s:String)->String {s.replacingOccurrences(of:"&",with:"&amp;").replacingOccurrences(of:"<",with:"&lt;").replacingOccurrences(of:">",with:"&gt;").replacingOccurrences(of:"\"",with:"&quot;")}
func write(_ p:String,_ t:String)throws{try t.write(toFile:dir+"/"+p,atomically:true,encoding:.utf8)}
let head="<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
let wns="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
let rns="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
var rels=[("rIdStyles","styles","styles.xml"),("rIdSettings","settings","settings.xml"),("rIdHeader","header","header1.xml"),("rIdFooter","footer","footer1.xml")]
var body=""
var count=0
var bookmark=0
var figures:[(String,String)]=[]
var chapterHeadings:[String]=[]
let text=try String(contentsOfFile:"reports/working/report.md",encoding:.utf8)
let blocks=text.components(separatedBy:"\n\n").filter{!$0.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty}
var mainWords=0;var mainActive=false
for b in blocks {
 if b.hasPrefix("# 1."){mainActive=true}
 if b.hasPrefix("# References"){mainActive=false}
 if mainActive && !b.hasPrefix("@") { let clean=b.replacingOccurrences(of:"#",with:"");mainWords += clean.split(whereSeparator:{$0.isWhitespace}).count }
 if b.hasPrefix("# "){chapterHeadings.append(String(b.dropFirst(2)).trimmingCharacters(in:.whitespacesAndNewlines))}
 if b.hasPrefix("@figure|"){let a=b.components(separatedBy:"|");figures.append((a[1],a[2]))}
}
func run(_ t:String)->String{"<w:r><w:t xml:space=\"preserve\">\(esc(t))</w:t></w:r>"}
func para(_ t:String,_ style:String="Normal",_ extra:String="",_ anchor:String?=nil)->String{
 var s="<w:p><w:pPr><w:pStyle w:val=\"\(style)\"/>\(extra)</w:pPr>"
 if let a=anchor{bookmark+=1;s += "<w:bookmarkStart w:id=\"\(bookmark)\" w:name=\"\(a)\"/>"}
 s+=run(t)
 if anchor != nil{s += "<w:bookmarkEnd w:id=\"\(bookmark)\"/>"}
 return s+"</w:p>"
}
func br(){body += "<w:p><w:r><w:br w:type=\"page\"/></w:r></w:p>"}
func nav(_ t:String,_ anchor:String)->String{
 "<w:p><w:pPr><w:pStyle w:val=\"Navigation\"/></w:pPr><w:hyperlink w:anchor=\"\(anchor)\" w:history=\"1\"><w:r><w:rPr><w:rStyle w:val=\"Hyperlink\"/></w:rPr><w:t>\(esc(t))</w:t></w:r></w:hyperlink></w:p>"
}
func imagePara(_ key:String,_ caption:String,_ width:Double)throws->String {
 count+=1;let id="rIdImage\(count)";let src=root+"/reports/images/"+key+".png";let target=dir+"/word/media/"+key+".png"
 if fm.fileExists(atPath:target){try fm.removeItem(atPath:target)};try fm.copyItem(atPath:src,toPath:target)
 rels.append((id,"image","media/"+key+".png"))
 let im=NSBitmapImageRep(data:try Data(contentsOf:URL(fileURLWithPath:src)))!
 let cx=Int(width*914400);let cy=Int(Double(cx)*Double(im.pixelsHigh)/Double(im.pixelsWide))
 return """
 <w:p><w:pPr><w:pStyle w:val="Figure"/><w:keepNext/><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="\(cx)" cy="\(cy)"/><wp:docPr id="\(count)" name="\(key)" descr="\(esc(caption))"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="\(count)" name="\(key).png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="\(id)"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="\(cx)" cy="\(cy)"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>
 """
}
body += para("FINAL YEAR PROJECT REPORT","CoverKicker")
body += para("HOLISTIC MIND","Title")
body += para("A Privacy-Conscious Mobile Wellness Application\nwith Hybrid Practice Recommendations","Subtitle")
body += para("Design, Implementation, and Critical Evaluation","CoverDescriptor")
body += para("Student name: ______________________________","CoverMetadata")
body += para("Student number: ____________________________","CoverMetadata")
body += para("Supervisor: _________________________________","CoverMetadata")
body += para("Degree / course: _____________________________","CoverMetadata")
body += para("Institution: __________________________________","CoverMetadata")
body += para("Submission date: ____________________________","CoverMetadata")
body += para("Report prepared: 3 October 2026","CoverDate")
body += para("Chapters 1–8: approximately \(mainWords.formatted()) words\n11 figures · Academic references · Project-grounded evaluation","CoverNote")
br()
// Abstract is preserved as front matter.
body += para("Abstract","Heading1","","abstract")
if blocks.count>1{body += para(blocks[1])}
br()
body += para("Contents","Heading1")
body += para("Select a chapter title to navigate within this document.","SmallNote")
for (i,t) in chapterHeadings.enumerated(){body += nav(t,i == 0 ? "abstract":"chapter\(i)")}
body += para("Word count basis","Heading2")
body += para("Approximately \(mainWords.formatted()) words in Chapters 1–8, including headings. Excludes cover, abstract, contents, captions, table, references, and appendix.","SmallNote")
body += para("Submission fields","Heading2")
body += para("Complete the cover metadata and add any institution-required declaration or acknowledgement before submission.","SmallNote")
br()
body += para("List of Figures","Heading1")
for (key,caption) in figures {
 let a=caption.components(separatedBy:". ");let short=a.count>1 ? a[0]+". "+a[1] : caption
 body += nav(short,"fig_"+key)
}
body += para("List of Tables","Heading2")
body += nav("Table 1. Saved journal-free ONNX benchmark","table1")
var chapterIndex=0
var skipAbstract=true
for b in blocks {
 if b.hasPrefix("# 1."){skipAbstract=false}
 if skipAbstract{if b.hasPrefix("# "){chapterIndex+=1};continue}
 if b.hasPrefix("# "){
  br();let title=String(b.dropFirst(2)).trimmingCharacters(in:.whitespacesAndNewlines)
  body += para(title,"Heading1","","chapter\(chapterIndex)");chapterIndex+=1
 } else if b.hasPrefix("## ") {
  body += para(String(b.dropFirst(3)),"Heading2")
 } else if b.hasPrefix("@figure|") {
  let a=b.components(separatedBy:"|");let width=Double(a[3])!
  body += try imagePara(a[1],a[2],width)
  body += para(a[2],"Caption","","fig_"+a[1])
 } else if b.hasPrefix("@table|") {
  let lines=b.components(separatedBy:"\n");body += para(String(lines[0].dropFirst(7)),"Caption","<w:keepNext/>","table1")
  let widths=[3150,1830,1830,2550]
  body += "<w:tbl><w:tblPr><w:tblW w:w=\"9360\" w:type=\"dxa\"/><w:tblInd w:w=\"120\" w:type=\"dxa\"/><w:tblBorders>"
  for edge in ["top","left","bottom","right","insideH","insideV"]{body += "<w:\(edge) w:val=\"single\" w:sz=\"4\" w:color=\"C9D2DC\"/>"}
  body += "</w:tblBorders><w:tblLayout w:type=\"fixed\"/><w:tblCellMar><w:top w:w=\"80\" w:type=\"dxa\"/><w:bottom w:w=\"80\" w:type=\"dxa\"/><w:start w:w=\"120\" w:type=\"dxa\"/><w:end w:w=\"120\" w:type=\"dxa\"/></w:tblCellMar></w:tblPr><w:tblGrid>"
  for x in widths{body += "<w:gridCol w:w=\"\(x)\"/>"};body += "</w:tblGrid>"
  for (j,line) in lines.dropFirst().filter({$0 != "@end"}).enumerated(){
   body += "<w:tr><w:trPr><w:cantSplit/>\(j == 0 ? "<w:tblHeader/>":"")</w:trPr>"
   for (k,cell) in line.components(separatedBy:"|").enumerated(){
    body += "<w:tc><w:tcPr><w:tcW w:w=\"\(widths[k])\" w:type=\"dxa\"/>\(j == 0 ? "<w:shd w:fill=\"F4F6F9\"/>":"")</w:tcPr>"+para(cell,j == 0 ? "TableHeader":"TableBody")+"</w:tc>"
   };body += "</w:tr>"
  };body += "</w:tbl>"+para("Source: Holistic Mind project (2026b), saved production-suite ONNX evaluation.","TableSource")
 } else {
  let style=chapterIndex == 10 ? "Reference":"Normal"
  body += para(b.replacingOccurrences(of:"\n",with:" "),style)
 }
}
body += """
 <w:sectPr><w:headerReference w:type="default" r:id="rIdHeader"/><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/><w:cols w:space="720"/><w:titlePg/></w:sectPr>
 """
try write("word/document.xml",head+"<w:document xmlns:w=\"\(wns)\" xmlns:r=\"\(rns)\" xmlns:wp=\"http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing\" xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" xmlns:pic=\"http://schemas.openxmlformats.org/drawingml/2006/picture\"><w:body>"+body+"</w:body></w:document>")
func style(_ id:String,_ name:String,_ size:Int,_ before:Int,_ after:Int,_ color:String="222222",_ bold:Bool=false,_ alignment:String="left",_ line:Int=320,_ extra:String="")->String {
 "<w:style w:type=\"paragraph\" w:styleId=\"\(id)\"><w:name w:val=\"\(name)\"/><w:basedOn w:val=\"Normal\"/><w:next w:val=\"Normal\"/><w:qFormat/><w:pPr><w:spacing w:before=\"\(before)\" w:after=\"\(after)\" w:line=\"\(line)\" w:lineRule=\"auto\"/><w:jc w:val=\"\(alignment)\"/><w:widowControl/>\(extra)</w:pPr><w:rPr><w:rFonts w:ascii=\"Calibri\" w:hAnsi=\"Calibri\"/><w:sz w:val=\"\(size)\"/><w:szCs w:val=\"\(size)\"/><w:color w:val=\"\(color)\"/>\(bold ? "<w:b/>":"")</w:rPr></w:style>"
}
var styles=head+"<w:styles xmlns:w=\"\(wns)\"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii=\"Calibri\" w:hAnsi=\"Calibri\"/><w:sz w:val=\"22\"/><w:lang w:val=\"en-GB\"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after=\"160\" w:line=\"320\" w:lineRule=\"auto\"/><w:widowControl/></w:pPr></w:pPrDefault></w:docDefaults>"
styles += "<w:style w:type=\"paragraph\" w:default=\"1\" w:styleId=\"Normal\"><w:name w:val=\"Normal\"/><w:qFormat/><w:pPr><w:spacing w:before=\"0\" w:after=\"160\" w:line=\"320\" w:lineRule=\"auto\"/><w:jc w:val=\"both\"/><w:widowControl/></w:pPr><w:rPr><w:rFonts w:ascii=\"Calibri\" w:hAnsi=\"Calibri\"/><w:sz w:val=\"22\"/><w:color w:val=\"222222\"/></w:rPr></w:style>"
styles += style("Heading1","Heading 1",32,360,200,"2E74B5",true,"left",320,"<w:keepNext/><w:keepLines/><w:outlineLvl w:val=\"0\"/>")
styles += style("Heading2","Heading 2",26,240,120,"2E74B5",true,"left",320,"<w:keepNext/><w:keepLines/><w:outlineLvl w:val=\"1\"/>")
styles += style("Heading3","Heading 3",24,160,80,"1F4D78",true,"left",320,"<w:keepNext/><w:outlineLvl w:val=\"2\"/>")
styles += style("Title","Title",60,0,200,"1F4D78",true,"center",280)
styles += style("Subtitle","Subtitle",30,0,200,"333333",false,"center",280)
styles += style("CoverKicker","Cover Kicker",22,1450,320,"2E74B5",true,"center",280)
styles += style("CoverDescriptor","Cover Descriptor",24,100,800,"444444",false,"center",280)
styles += style("CoverMetadata","Cover Metadata",22,0,140,"333333",false,"center",280)
styles += style("CoverDate","Cover Date",22,450,160,"333333",false,"center",280)
styles += style("CoverNote","Cover Note",20,0,0,"555555",false,"center",280)
styles += style("SmallNote","Small Note",20,0,140,"555555",false,"left",280)
styles += style("Navigation","Navigation",22,0,180,"2E74B5",false,"left",280)
styles += style("Caption","Caption",19,80,180,"555555",false,"left",270,"<w:keepLines/>")
styles += style("Figure","Figure",22,180,60,"222222",false,"center",240,"<w:keepLines/>")
styles += style("TableHeader","Table Header",20,0,80,"222222",true,"left",270)
styles += style("TableBody","Table Body",20,0,80,"222222",false,"left",270)
styles += style("TableSource","Table Source",18,80,80,"555555",false,"left",270)
styles += style("Reference","Reference",20,0,160,"222222",false,"left",290)
styles += style("Header","Header",18,0,0,"666666",false,"left",240)
styles += style("Footer","Footer",18,0,0,"666666",false,"right",240)
styles += "<w:style w:type=\"character\" w:styleId=\"Hyperlink\"><w:name w:val=\"Hyperlink\"/><w:rPr><w:color w:val=\"2E74B5\"/><w:u w:val=\"single\"/></w:rPr></w:style></w:styles>"
try write("word/styles.xml",styles)
try write("word/settings.xml",head+"<w:settings xmlns:w=\"\(wns)\"><w:updateFields w:val=\"true\"/><w:defaultTabStop w:val=\"720\"/><w:compat/></w:settings>")
try write("word/header1.xml",head+"<w:hdr xmlns:w=\"\(wns)\">"+para("HOLISTIC MIND  |  FINAL YEAR PROJECT REPORT","Header")+"</w:hdr>")
try write("word/footer1.xml",head+"<w:ftr xmlns:w=\"\(wns)\"><w:p><w:pPr><w:pStyle w:val=\"Footer\"/></w:pPr>"+run("Page ")+"<w:fldSimple w:instr=\"PAGE\"><w:r><w:t>1</w:t></w:r></w:fldSimple>"+run(" of ")+"<w:fldSimple w:instr=\"NUMPAGES\"><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>")
try write("word/_rels/document.xml.rels",head+"<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"+rels.map{"<Relationship Id=\"\($0.0)\" Type=\"\(rns)/\($0.1)\" Target=\"\($0.2)\"/>"}.joined()+"</Relationships>")
try write("_rels/.rels",head+"<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"\(rns)/officeDocument\" Target=\"word/document.xml\"/><Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties\" Target=\"docProps/core.xml\"/><Relationship Id=\"rId3\" Type=\"\(rns)/extended-properties\" Target=\"docProps/app.xml\"/></Relationships>")
try write("docProps/core.xml",head+"<cp:coreProperties xmlns:cp=\"http://schemas.openxmlformats.org/package/2006/metadata/core-properties\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\"><dc:title>Holistic Mind: A Privacy-Conscious Mobile Wellness Application</dc:title><dc:subject>Final year project report</dc:subject><dc:description>Approximately \(mainWords) main-body words, 11 figures, and project-grounded evaluation.</dc:description></cp:coreProperties>")
try write("docProps/app.xml",head+"<Properties xmlns=\"http://schemas.openxmlformats.org/officeDocument/2006/extended-properties\"><Application>Report Builder</Application><Words>\(mainWords)</Words></Properties>")
var types=head+"<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Default Extension=\"png\" ContentType=\"image/png\"/>"
for (p,t) in [("word/document.xml","application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"),("word/styles.xml","application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"),("word/settings.xml","application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"),("word/header1.xml","application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"),("word/footer1.xml","application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"),("docProps/core.xml","application/vnd.openxmlformats-package.core-properties+xml"),("docProps/app.xml","application/vnd.openxmlformats-officedocument.extended-properties+xml")] {types += "<Override PartName=\"/\(p)\" ContentType=\"\(t)\"/>"}
try write("[Content_Types].xml",types+"</Types>")
let destination=root+"/reports/Holistic-Mind-Project-Report.docx"
if fm.fileExists(atPath:destination){try fm.removeItem(atPath:destination)}
let zip=Process();zip.executableURL=URL(fileURLWithPath:"/usr/bin/zip");zip.currentDirectoryURL=URL(fileURLWithPath:dir);zip.arguments=["-q","-r",destination,"[Content_Types].xml","_rels","docProps","word"];try zip.run();zip.waitUntilExit();if zip.terminationStatus != 0{fatalError("zip failed")}
for path in ["word/document.xml","word/styles.xml","word/_rels/document.xml.rels","[Content_Types].xml"]{_ = try XMLDocument(contentsOf:URL(fileURLWithPath:dir+"/"+path))}
let allXML=try XMLDocument(contentsOf:URL(fileURLWithPath:dir+"/word/document.xml"))
let pics=try allXML.nodes(forXPath:"//*[local-name()='drawing']").count
let tables=try allXML.nodes(forXPath:"//*[local-name()='tbl']").count
let anchors=Set(try allXML.nodes(forXPath:"//*[local-name()='bookmarkStart']/@*[local-name()='name']").compactMap{$0.stringValue})
let links=try allXML.nodes(forXPath:"//*[local-name()='hyperlink']/@*[local-name()='anchor']").compactMap{$0.stringValue}
for a in links {if !anchors.contains(a){print("Missing anchor: \(a)")}}
print("Main-body word count: \(mainWords)")
print("Pictures: \(pics); tables: \(tables); navigation anchors: \(anchors.count)")
print(destination)
