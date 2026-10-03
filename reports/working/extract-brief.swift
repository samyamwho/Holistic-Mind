import Foundation
import PDFKit
let inputs = [("/Users/samyamshrestha/Downloads/T1 CMP6200 Final Report.pdf", "final-report-brief")]
for (path, name) in inputs {
 guard let pdf = PDFDocument(url: URL(fileURLWithPath:path)) else { fatalError(path) }
 var result = ""
 for i in 0..<pdf.pageCount { result += "\n--- PAGE \(i+1) ---\n" + (pdf.page(at:i)?.string ?? "") }
 try result.write(toFile:"reports/working/\(name).txt", atomically:true, encoding:.utf8)
 print("\(name): \(pdf.pageCount) pages")
}
