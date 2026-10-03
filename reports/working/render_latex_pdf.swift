import Foundation
import AppKit
import PDFKit
let args=CommandLine.arguments
let path=args[1]; let out=args[2]; let width=CGFloat(args.count>3 ? Double(args[3])! : 1200)
try FileManager.default.createDirectory(atPath:out,withIntermediateDirectories:true)
guard let pdf=PDFDocument(url:URL(fileURLWithPath:path)) else {fatalError("Cannot open PDF")}
var images:[NSImage]=[]
var extracted=""
for i in 0..<pdf.pageCount {
 let page=pdf.page(at:i)!;let r=page.bounds(for:.mediaBox); let h=width*r.height/r.width
 let im=NSImage(size:NSSize(width:width,height:h)); im.lockFocus();NSColor.white.setFill();NSRect(x:0,y:0,width:width,height:h).fill()
 let ctx=NSGraphicsContext.current!.cgContext;ctx.saveGState();ctx.scaleBy(x:width/r.width,y:width/r.width);page.draw(with:.mediaBox,to:ctx);ctx.restoreGState();im.unlockFocus()
 let rep=NSBitmapImageRep(data:im.tiffRepresentation!)!;try rep.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:out+String(format:"/page-%03d.png",i+1)))
 images.append(im);extracted+="\n--- PAGE \(i+1) ---\n"+(page.string ?? "")
}
try extracted.write(toFile:out+"/extracted.txt",atomically:true,encoding:.utf8)
let cols=4;let rows=3;let thumbW:CGFloat=300;let cellH:CGFloat=452
for sheet in 0..<(Int(ceil(Double(images.count)/12))) {
 let im=NSImage(size:NSSize(width:CGFloat(cols)*thumbW,height:CGFloat(rows)*cellH));im.lockFocusFlipped(true);NSColor(calibratedWhite:0.90,alpha:1).setFill();NSRect(x:0,y:0,width:CGFloat(cols)*thumbW,height:CGFloat(rows)*cellH).fill()
 for k in 0..<12 {let i=sheet*12+k;if i>=images.count{break};let x=CGFloat(k%cols)*thumbW;let y=CGFloat(k/cols)*cellH;let src=images[i];let h=(thumbW-16)*src.size.height/src.size.width
 src.draw(in:NSRect(x:x+8,y:y+25,width:thumbW-16,height:h),from:.zero,operation:.sourceOver,fraction:1,respectFlipped:true,hints:nil)
 ("Page \(i+1)" as NSString).draw(at:NSPoint(x:x+10,y:y+4),withAttributes:[.font:NSFont.boldSystemFont(ofSize:13),.foregroundColor:NSColor.black])
 }
 im.unlockFocus();let rep=NSBitmapImageRep(data:im.tiffRepresentation!)!;try rep.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:out+"/contact-\(sheet+1).png"))
}
print("Rendered \(pdf.pageCount) pages from \(path)")
