import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { ref, uploadBytes, getBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type GeneratePDFRequest = {
  caseId: string;
  aizaInfo?: {
    orderName?: string;
    customerName?: string;
    customerAddress?: string;
    customerPhone?: string;
    productName?: string;
    productCode?: string;
    productColor?: string;
  };
  workCheck?: {
    items: Array<{ label: string; checked: boolean; qty?: number; unitPrice?: number }>;
    subtotalInstall: number;
    subtotalParts: number;
    subtotalExtra: number;
    total: number;
    signatureDataUrl?: string;
  };
};

export async function POST(request: Request) {
  try {
    const body: GeneratePDFRequest = await request.json();
    const { caseId, aizaInfo, workCheck } = body;

    if (!caseId) {
      return NextResponse.json({ error: "caseId is required" }, { status: 400 });
    }

    // PDF生成
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    let yPosition = margin;

    // ヘッダー
    doc.setFontSize(16);
    doc.text("設置完了報告書", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 12;

    // 基本情報
    doc.setFontSize(10);
    doc.text(`依頼票受付NO: ${aizaInfo?.productCode || ""}`, margin, yPosition);
    yPosition += 8;

    doc.text(`設置先お客様名: ${aizaInfo?.customerName || ""}`, margin, yPosition);
    yPosition += 8;

    doc.text(`依頼元: ${aizaInfo?.orderName || ""}`, margin, yPosition);
    yPosition += 8;

    doc.text(`住所: ${aizaInfo?.customerAddress || ""}`, margin, yPosition);
    yPosition += 8;

    doc.text(`電話: ${aizaInfo?.customerPhone || ""}`, margin, yPosition);
    yPosition += 12;

    // 商品情報
    doc.setFontSize(11);
    doc.text("商品情報", margin, yPosition);
    yPosition += 6;

    doc.setFontSize(10);
    doc.text(`商品名: ${aizaInfo?.productName || ""}`, margin + 2, yPosition);
    yPosition += 6;

    doc.text(`製造番号: ${aizaInfo?.productCode || ""}`, margin + 2, yPosition);
    yPosition += 6;

    doc.text(`色: ${aizaInfo?.productColor || ""}`, margin + 2, yPosition);
    yPosition += 12;

    // 工事内容テーブル
    if (workCheck && workCheck.items.length > 0) {
      doc.setFontSize(11);
      doc.text("工事内容", margin, yPosition);
      yPosition += 8;

      doc.setFontSize(9);
      const tableData = workCheck.items
        .filter((item) => item.checked)
        .map((item) => {
          const amount = (item.qty || 0) * (item.unitPrice || 0);
          return [
            item.label,
            String(item.qty || 0),
            `¥${(item.unitPrice || 0).toLocaleString("ja-JP")}`,
            `¥${amount.toLocaleString("ja-JP")}`
          ];
        });

      if (tableData.length > 0) {
        (doc as any).autoTable({
          head: [["内容", "数量", "単価", "金額"]],
          body: tableData,
          startY: yPosition,
          margin: margin,
          styles: { font: "helvetica", fontSize: 9 },
          headStyles: { fillColor: [200, 200, 200] }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 8;
      }

      // 金額
      doc.setFontSize(10);
      doc.text(`小計（設置）: ¥${workCheck.subtotalInstall.toLocaleString("ja-JP")}`, margin, yPosition);
      yPosition += 6;

      doc.text(`小計（部材・料金）: ¥${workCheck.subtotalParts.toLocaleString("ja-JP")}`, margin, yPosition);
      yPosition += 6;

      doc.text(`小計（別途）: ¥${workCheck.subtotalExtra.toLocaleString("ja-JP")}`, margin, yPosition);
      yPosition += 8;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`合計: ¥${workCheck.total.toLocaleString("ja-JP")}`, margin, yPosition);
      yPosition += 12;

      doc.setFont("helvetica", "normal");
    }

    // サイン
    if (workCheck?.signatureDataUrl) {
      doc.setFontSize(11);
      doc.text("お客様サイン", margin, yPosition);
      yPosition += 8;

      doc.addImage(workCheck.signatureDataUrl, "PNG", margin, yPosition, 80, 30);
      yPosition += 40;
    }

    // QRコード生成
    const qrCodeUrl = `https://example.com/cases/${caseId}/report`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl);

    // QRコードをPDFに追加
    if (yPosition + 40 > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(10);
    doc.text("お客様の控え（QRコードで確認）", margin, yPosition);
    yPosition += 8;

    doc.addImage(qrCodeDataUrl, "PNG", margin, yPosition, 30, 30);

    // PDF をバッファに変換
    const pdfData = doc.output("arraybuffer");
    const pdfBuffer = Buffer.from(pdfData);

    // Firebase Storage に保存
    const storageRef = ref(storage, `cases/${caseId}/completion-report-${Date.now()}.pdf`);
    await uploadBytes(storageRef, pdfBuffer, { contentType: "application/pdf" });

    // 公開URLの生成（簡易版：実際はgetDownloadURLを使う）
    const pdfUrl = `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/cases%2F${caseId}%2Fcompletion-report-${Date.now()}.pdf?alt=media`;

    return NextResponse.json({
      success: true,
      pdfUrl,
      qrCodeUrl,
      caseId
    });
  } catch (error) {
    console.error("[PDF Generate] Error:", error);
    return NextResponse.json(
      {
        error: "PDF生成に失敗しました",
        details: error instanceof Error ? error.message : "unknown error"
      },
      { status: 500 }
    );
  }
}
