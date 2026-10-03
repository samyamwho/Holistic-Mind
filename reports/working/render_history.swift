import Foundation
import AppKit
import PDFKit
let cases=[("Sunway Final Progress Review.pdf",[3,4,5]),("Interim Progress Review Samyam Shrestha.pdf",[3])]
for (file,pages) in cases {
 let pdf=PDFDocument(url:URL(fileURLWithPath:"/Users/samyamshrestha/Downloads/"+file))!
 for i in pages {let page=pdf.page(at:i)!;let image=page.thumbnail(of:NSSize(width:1400,height:2000),for:.mediaBox);let rep=NSBitmapImageRep(data:image.tiffRepresentation!)!;let stem=file.hasPrefix("Sunway") ? "final":"june";try rep.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:"reports/working/history/\(stem)-page-\(i+1).png"))}
}
