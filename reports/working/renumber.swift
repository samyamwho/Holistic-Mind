import Foundation
let path="reports/working/report-detailed.md"
var s=try String(contentsOfFile:path,encoding:.utf8)
let blocks=s.components(separatedBy:"\n\n")
var figs:[Int:Int]=[:];var tables:[Int:Int]=[:]
for b in blocks {if b.hasPrefix("@figure|"){let cap=b.components(separatedBy:"|")[2];let n=Int(cap.components(separatedBy:".")[0].replacingOccurrences(of:"Figure ",with:""))!;figs[n]=figs.count+1};if b.hasPrefix("@table|"){let cap=String(b.dropFirst(7));let n=Int(cap.components(separatedBy:".")[0].replacingOccurrences(of:"Table ",with:""))!;tables[n]=tables.count+1}}
for (type,map) in [("Figure",figs),("Table",tables)] {
 let rx=try NSRegularExpression(pattern:"\\b"+type+" ([0-9]+)\\b")
 let matches=rx.matches(in:s,range:NSRange(s.startIndex...,in:s))
 for m in matches.reversed(){if let r=Range(m.range(at:1),in:s),let n=Int(s[r]),let dest=map[n]{s.replaceSubrange(r,with:String(dest))}}
}
s=s.replacingOccurrences(of:"Figures 13 and 14 reproduce",with:"Figures 11 and 12 reproduce") // standalone grouped appendix numbers are not parsed by the singular Figure pattern.
s=s.replacingOccurrences(of:"Figures 1 and 7 are existing",with:"Figures 1 and 8 are existing")
s=s.replacingOccurrences(of:"Figures 10 and 11 are existing",with:"Figures 14 and 15 are existing")
try s.write(toFile:path,atomically:true,encoding:.utf8)
print("Figure map: \(figs); table map: \(tables)")
