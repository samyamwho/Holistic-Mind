import Foundation
import PDFKit
let names=["Holistic Mind App by Samyam Shrestha.pdf", "Interim Progress Review Samyam Shrestha.pdf", "Samyam Shrestha Interim Progress Review (1).pdf", "Samyam Shrestha Modern Data Store.pdf", "Sunway Final Progress Review.pdf", "Sunway Interim Report.pdf"]
try FileManager.default.createDirectory(atPath:"reports/working/history",withIntermediateDirectories:true)
for (i,name) in names.enumerated(){
 let path="/Users/samyamshrestha/Downloads/"+name
 guard let doc=PDFDocument(url:URL(fileURLWithPath:path)) else {print("Cannot open: \(name)");continue}
 var s="SOURCE: \(name)\n"
 for j in 0..<doc.pageCount {s += "\n--- PAGE \(j+1) ---\n"+(doc.page(at:j)?.string ?? "")}
 try s.write(toFile:"reports/working/history/report-\(i+1).txt",atomically:true,encoding:.utf8)
 print("\(i+1). \(name): \(doc.pageCount) pages, \(s.count) extracted characters")
}
