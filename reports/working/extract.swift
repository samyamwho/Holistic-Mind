import Foundation
import PDFKit
let inputs = [("/Users/samyamshrestha/Downloads/Abhash Rai 23140736 - A Semantic Approach to Tourist Recommendation in Nepal.pdf", "abhash"), ("/Users/samyamshrestha/Downloads/Sudeep_Fullel_23140750.pdf", "sudeep")]
for (path, name) in inputs {
 guard let pdf = PDFDocument(url: URL(fileURLWithPath:path)) else { fatalError(path) }
 var result = ""
 for i in 0..<pdf.pageCount { result += "\n--- PAGE \(i+1) ---\n" + (pdf.page(at:i)?.string ?? "") }
 try result.write(toFile:"reports/working/\(name).txt", atomically:true, encoding:.utf8)
 print("\(name): \(pdf.pageCount) pages")
}
