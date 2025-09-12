import React, { useCallback } from 'react';
import jsPDF from 'jspdf';
import type { AssessmentResult } from '../../types';
import { PDF_CONFIG } from '../../constants';

interface PDFGeneratorProps {
  result: AssessmentResult;
  children: React.ReactNode;
  className?: string;
}

const PDFGenerator: React.FC<PDFGeneratorProps> = ({
  result,
  children,
  className = ''
}) => {
  // Generate PDF report
  const generatePDF = useCallback(async () => {
    try {
      const pdf = new jsPDF({
        orientation: PDF_CONFIG.orientation,
        unit: 'mm',
        format: PDF_CONFIG.paperSize
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = PDF_CONFIG.margins.left;
      const contentWidth = pageWidth - (2 * margin);
      
      let currentY = margin;

      // Helper function to add text with automatic line breaks
      const addText = (text: string, fontSize: number, isBold: boolean = false, color: string = PDF_CONFIG.colors.text) => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
        
        const lines = pdf.splitTextToSize(text, contentWidth);
        
        // Check if we need a new page
        if (currentY + (lines.length * fontSize * 0.5) > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }
        
        pdf.text(lines, margin, currentY);
        currentY += lines.length * fontSize * 0.5 + 5;
      };

      // Helper function to add a section separator
      const addSeparator = () => {
        currentY += 5;
        pdf.setLineWidth(0.5);
        pdf.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 10;
      };

      // Title
      addText(PDF_CONFIG.title, PDF_CONFIG.fontSize.title, true, PDF_CONFIG.colors.primary);
      addText(PDF_CONFIG.subtitle, PDF_CONFIG.fontSize.subtitle, false, PDF_CONFIG.colors.secondary);
      
      // Assessment info
      currentY += 5;
      addText(`Зона: ${result.zoneName}`, PDF_CONFIG.fontSize.heading, true);
      addText(`Дата и время: ${result.completedAt.toLocaleString('ru-RU')}`, PDF_CONFIG.fontSize.body);
      addText(`Время обработки: ${result.processingTime} секунд`, PDF_CONFIG.fontSize.body);
      addText(`Общая оценка: ${result.overallScore}/5 звезд`, PDF_CONFIG.fontSize.heading, true);
      
      addSeparator();

      // Questions and answers
      addText('РЕЗУЛЬТАТЫ ОЦЕНКИ', PDF_CONFIG.fontSize.heading, true);
      
      result.questionAnswers.forEach((answer, index) => {
        addText(`${index + 1}. ${answer.questionText}`, PDF_CONFIG.fontSize.body, true);
        addText(`Ответ: ${answer.answer}`, PDF_CONFIG.fontSize.body);
        addText(`Оценка: ${answer.starRating}/5 звезд`, PDF_CONFIG.fontSize.body);
        addText(`Обоснование: ${answer.reasoning}`, PDF_CONFIG.fontSize.small);
        
        if (answer.relatedObjects.length > 0) {
          addText(`Обнаруженные объекты: ${answer.relatedObjects.join(', ')}`, PDF_CONFIG.fontSize.small);
        }
        
        addText(`Уверенность: ${Math.round(answer.confidence * 100)}%`, PDF_CONFIG.fontSize.small);
        currentY += 5;
      });

      addSeparator();

      // Detected objects
      addText('ОБНАРУЖЕННЫЕ ОБЪЕКТЫ', PDF_CONFIG.fontSize.heading, true);
      
      const positiveObjects = result.detectedObjects.filter(obj => !obj.isNegative);
      const negativeObjects = result.detectedObjects.filter(obj => obj.isNegative);

      if (positiveObjects.length > 0) {
        addText('Положительные факторы:', PDF_CONFIG.fontSize.body, true);
        positiveObjects.forEach(obj => {
          addText(`• ${obj.description || obj.class} (${obj.count}x, ${Math.round(obj.confidence * 100)}%)`, PDF_CONFIG.fontSize.small);
        });
        currentY += 5;
      }

      if (negativeObjects.length > 0) {
        addText('Проблемы и замечания:', PDF_CONFIG.fontSize.body, true);
        negativeObjects.forEach(obj => {
          addText(`• ${obj.description || obj.class} (${obj.count}x, ${Math.round(obj.confidence * 100)}%)`, PDF_CONFIG.fontSize.small);
        });
        currentY += 5;
      }

      addSeparator();

      // Aggregated comment
      addText('СВОДНЫЙ КОММЕНТАРИЙ', PDF_CONFIG.fontSize.heading, true);
      addText(result.aggregatedComment, PDF_CONFIG.fontSize.body);

      addSeparator();

      // Footer
      addText('Отчет создан автоматически с помощью системы Secret Guest MVP', PDF_CONFIG.fontSize.small, false, PDF_CONFIG.colors.secondary);
      addText('Использовано компьютерное зрение для анализа видео', PDF_CONFIG.fontSize.small, false, PDF_CONFIG.colors.secondary);

      // Save the PDF
      const fileName = `secret-guest-${result.zoneName}-${result.completedAt.getTime()}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Ошибка при создании PDF-отчета. Попробуйте еще раз.');
    }
  }, [result]);

  return (
    <button
      onClick={generatePDF}
      className={className}
    >
      {children}
    </button>
  );
};

export default PDFGenerator;