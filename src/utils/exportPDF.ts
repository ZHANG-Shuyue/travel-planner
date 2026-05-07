import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

interface ExportPdfOptions {
  title?: string
  subtitle?: string
}

function mmToPx(mm: number, canvasWidthPx: number, contentWidthMm: number) {
  return (mm * canvasWidthPx) / contentWidthMm
}

export async function exportItineraryPDF(element: HTMLElement, fileName: string, options: ExportPdfOptions = {}) {
  const styleTag = document.createElement('style')
  styleTag.innerHTML = `
    .pdf-exporting .no-pdf-hide { display: none !important; }
    .pdf-exporting { background: #FAF8F5 !important; color: #1f2937 !important; }
  `

  element.classList.add('pdf-exporting')
  element.appendChild(styleTag)

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#FAF8F5',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    })

    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const marginX = 10
    const marginY = 10
    const contentWidthMm = pdfWidth - marginX * 2

    const titleLines: string[] = []
    if (options.title) titleLines.push(options.title)
    if (options.subtitle) titleLines.push(options.subtitle)

    const headerMm = titleLines.length ? 12 + titleLines.length * 6 : 0
    const pageContentHeightMm = pdfHeight - marginY * 2 - headerMm
    const pageContentHeightPx = mmToPx(pageContentHeightMm, canvas.width, contentWidthMm)

    const cards = Array.from(element.querySelectorAll<HTMLElement>('[data-pdf-card="true"]'))
    const scaleY = canvas.height / Math.max(1, element.scrollHeight)
    const breakpoints = cards
      .map((card) => {
        const top = card.offsetTop
        const bottom = top + card.offsetHeight
        return {
          top: Math.floor(top * scaleY),
          bottom: Math.floor(bottom * scaleY),
        }
      })
      .filter((item) => item.bottom > 0)
      .sort((a, b) => a.top - b.top)

    const slices: Array<{ y: number; h: number }> = []
    let startY = 0

    while (startY < canvas.height) {
      const targetEnd = Math.min(canvas.height, startY + pageContentHeightPx)
      const possibleBreak = breakpoints
        .map((item) => item.bottom)
        .filter((point) => point > startY + 80 && point <= targetEnd)
      const endY = possibleBreak.length ? Math.max(...possibleBreak) : targetEnd
      slices.push({ y: startY, h: Math.max(1, endY - startY) })
      startY = endY
      if (canvas.height - startY < 40) break
    }

    if (!slices.length) slices.push({ y: 0, h: canvas.height })

    slices.forEach((slice, index) => {
      if (index > 0) pdf.addPage()

      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvas.width
      pageCanvas.height = slice.h
      const ctx = pageCanvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(canvas, 0, slice.y, canvas.width, slice.h, 0, 0, canvas.width, slice.h)

      let imgY = marginY
      if (titleLines.length) {
        pdf.setTextColor(60, 70, 80)
        pdf.setFontSize(14)
        pdf.text(titleLines[0], marginX, marginY + 5)
        if (titleLines[1]) {
          pdf.setFontSize(10)
          pdf.setTextColor(90, 100, 110)
          pdf.text(titleLines[1], marginX, marginY + 11)
        }
        imgY = marginY + headerMm
      }

      const imgData = pageCanvas.toDataURL('image/jpeg', 0.95)
      const imgHeightMm = (slice.h * contentWidthMm) / pageCanvas.width
      pdf.addImage(imgData, 'JPEG', marginX, imgY, contentWidthMm, imgHeightMm)
    })

    pdf.save(fileName)
  } finally {
    styleTag.remove()
    element.classList.remove('pdf-exporting')
  }
}
