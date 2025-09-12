import jsPDF from 'jspdf';
import { AssessmentResult, QuestionAnswer, DetectedObject, PDFReportConfig } from '../types';
import { PDF_CONFIG } from '../constants';

export interface PDFGenerationOptions {
  config?: Partial<PDFReportConfig>;
  includeObjectDetails?: boolean;
  includeFrameImages?: boolean;
  addWatermark?: boolean;
  language?: 'ru' | 'en';
}

export class PDFReportGenerator {
  private pdf: jsPDF;
  private currentY: number = 0;
  private pageHeight: number = 0;
  private pageWidth: number = 0;
  private margin: number = 20;

  constructor() {
    this.pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    this.pageHeight = this.pdf.internal.pageSize.height;
    this.pageWidth = this.pdf.internal.pageSize.width;
    this.currentY = this.margin;
  }

  /**
   * Generate PDF report from assessment result
   */
  async generateReport(
    result: AssessmentResult,
    options: PDFGenerationOptions = {}
  ): Promise<Blob> {
    const {
      config = {},
      includeObjectDetails = true,
      includeFrameImages = false,
      addWatermark = true,
      language = 'ru'
    } = options;

    const reportConfig = { ...PDF_CONFIG, ...config };

    try {
      // Reset position
      this.currentY = this.margin;

      // Generate header
      this.addHeader(reportConfig, language);

      // Add title and zone info
      this.addTitleSection(result, reportConfig, language);

      // Add overall score section
      this.addOverallScoreSection(result, reportConfig, language);

      // Add question-answer details
      this.addQuestionAnswersSection(result, reportConfig, language);

      if (includeObjectDetails) {
        // Add detected objects section
        this.addDetectedObjectsSection(result, reportConfig, language);
      }

      // Add summary section
      this.addSummarySection(result, reportConfig, language);

      // Add footer
      this.addFooter(reportConfig, language);

      if (addWatermark) {
        this.addWatermark(language);
      }

      // Return PDF as blob
      const pdfBlob = this.pdf.output('blob');
      return pdfBlob;

    } catch (error) {
      console.error('Failed to generate PDF report:', error);
      throw new Error('PDF generation failed');
    }
  }

  /**
   * Add header with logo and title
   */
  private addHeader(config: PDFReportConfig, language: 'ru' | 'en'): void {
    const title = language === 'ru' ? 'Отчет Тайного Гостя' : 'Secret Guest Report';
    const subtitle = language === 'ru' 
      ? 'Автоматизированная оценка качества отеля' 
      : 'Automated Hotel Quality Assessment';

    // Title
    this.pdf.setFontSize(PDF_CONFIG.fontSize.title);
    this.pdf.setTextColor(PDF_CONFIG.colors.primary);
    this.pdf.text(title, this.margin, this.currentY);
    this.currentY += 8;

    // Subtitle
    this.pdf.setFontSize(PDF_CONFIG.fontSize.subtitle);
    this.pdf.setTextColor(PDF_CONFIG.colors.secondary);
    this.pdf.text(subtitle, this.margin, this.currentY);
    this.currentY += 10;

    // Separator line
    this.pdf.setDrawColor(PDF_CONFIG.colors.secondary);
    this.pdf.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 8;
  }

  /**
   * Add title section with zone and timestamp
   */
  private addTitleSection(
    result: AssessmentResult,
    config: PDFReportConfig,
    language: 'ru' | 'en'
  ): void {
    const zoneLabel = language === 'ru' ? 'Оцениваемая зона:' : 'Assessed Zone:';
    const dateLabel = language === 'ru' ? 'Дата оценки:' : 'Assessment Date:';
    const timeLabel = language === 'ru' ? 'Время обработки:' : 'Processing Time:';

    this.pdf.setFontSize(PDF_CONFIG.fontSize.heading);
    this.pdf.setTextColor(PDF_CONFIG.colors.text);

    // Zone name
    this.pdf.text(zoneLabel, this.margin, this.currentY);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(result.zoneName, this.margin + 40, this.currentY);
    this.currentY += 6;

    // Date
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(dateLabel, this.margin, this.currentY);
    this.pdf.text(
      result.completedAt.toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US'),
      this.margin + 40,
      this.currentY
    );
    this.currentY += 6;

    // Processing time
    this.pdf.text(timeLabel, this.margin, this.currentY);
    this.pdf.text(`${result.processingTime} сек`, this.margin + 40, this.currentY);
    this.currentY += 10;
  }

  /**
   * Add overall score section with visual elements
   */
  private addOverallScoreSection(
    result: AssessmentResult,
    config: PDFReportConfig,
    language: 'ru' | 'en'
  ): void {
    const scoreLabel = language === 'ru' ? 'Общая оценка:' : 'Overall Score:';
    const ratingLabel = language === 'ru' ? 'Рейтинг:' : 'Rating:';

    // Section title
    this.pdf.setFontSize(PDF_CONFIG.fontSize.heading);
    this.pdf.setTextColor(PDF_CONFIG.colors.primary);
    this.pdf.text(scoreLabel, this.margin, this.currentY);
    this.currentY += 8;

    // Score circle
    const scoreColor = this.getScoreColor(result.overallScore);
    this.pdf.setFillColor(scoreColor);
    this.pdf.circle(this.margin + 15, this.currentY + 5, 8, 'F');
    
    // Score text
    this.pdf.setFontSize(16);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.text(result.overallScore.toFixed(1), this.margin + 11, this.currentY + 8);

    // Stars
    this.addStarRating(this.margin + 35, this.currentY + 2, result.overallScore);

    // Rating description
    this.pdf.setFontSize(PDF_CONFIG.fontSize.body);
    this.pdf.setTextColor(PDF_CONFIG.colors.text);
    const ratingText = this.getScoreDescription(result.overallScore, language);
    this.pdf.text(`${ratingLabel} ${ratingText}`, this.margin + 35, this.currentY + 12);

    this.currentY += 20;
  }

  /**
   * Add question-answers section
   */
  private addQuestionAnswersSection(
    result: AssessmentResult,
    config: PDFReportConfig,
    language: 'ru' | 'en'
  ): void {
    const sectionTitle = language === 'ru' ? 'Детализация по вопросам:' : 'Question Details:';

    this.pdf.setFontSize(PDF_CONFIG.fontSize.heading);
    this.pdf.setTextColor(PDF_CONFIG.colors.primary);
    this.pdf.text(sectionTitle, this.margin, this.currentY);
    this.currentY += 10;

    for (let i = 0; i < result.questionAnswers.length; i++) {
      const qa = result.questionAnswers[i];
      
      // Check if we need a new page
      if (this.currentY > this.pageHeight - 40) {
        this.addNewPage();
      }

      this.addQuestionAnswer(qa, i + 1, language);
      this.currentY += 5;
    }
  }

  /**
   * Add single question-answer block
   */
  private addQuestionAnswer(qa: QuestionAnswer, index: number, language: 'ru' | 'en'): void {
    // Question number and text
    this.pdf.setFontSize(PDF_CONFIG.fontSize.body);
    this.pdf.setTextColor(PDF_CONFIG.colors.text);
    this.pdf.setFont('helvetica', 'bold');
    
    const questionText = `${index}. ${qa.questionText}`;
    const lines = this.pdf.splitTextToSize(questionText, this.pageWidth - 2 * this.margin);
    this.pdf.text(lines, this.margin, this.currentY);
    this.currentY += lines.length * 5;

    // Answer
    this.pdf.setFont('helvetica', 'normal');
    const answerLabel = language === 'ru' ? 'Ответ:' : 'Answer:';
    this.pdf.text(answerLabel, this.margin + 5, this.currentY);
    this.currentY += 5;

    const answerLines = this.pdf.splitTextToSize(qa.answer, this.pageWidth - 2 * this.margin - 10);
    this.pdf.text(answerLines, this.margin + 5, this.currentY);
    this.currentY += answerLines.length * 4;

    // Stars and confidence
    this.addStarRating(this.margin + 5, this.currentY, qa.starRating);
    
    const confidenceLabel = language === 'ru' ? 'Уверенность:' : 'Confidence:';
    this.pdf.text(
      `${confidenceLabel} ${(qa.confidence * 100).toFixed(0)}%`,
      this.margin + 50,
      this.currentY + 3
    );

    this.currentY += 10;
  }

  /**
   * Add detected objects section
   */
  private addDetectedObjectsSection(
    result: AssessmentResult,
    config: PDFReportConfig,
    language: 'ru' | 'en'
  ): void {
    if (this.currentY > this.pageHeight - 60) {
      this.addNewPage();
    }

    const sectionTitle = language === 'ru' ? 'Обнаруженные объекты:' : 'Detected Objects:';

    this.pdf.setFontSize(PDF_CONFIG.fontSize.heading);
    this.pdf.setTextColor(PDF_CONFIG.colors.primary);
    this.pdf.text(sectionTitle, this.margin, this.currentY);
    this.currentY += 10;

    const positiveObjects = result.detectedObjects.filter(obj => !obj.isNegative);
    const negativeObjects = result.detectedObjects.filter(obj => obj.isNegative);

    if (positiveObjects.length > 0) {
      const positiveLabel = language === 'ru' ? 'Положительные факторы:' : 'Positive Factors:';
      this.pdf.setFontSize(PDF_CONFIG.fontSize.body);
      this.pdf.setTextColor(PDF_CONFIG.colors.success);
      this.pdf.text(positiveLabel, this.margin + 5, this.currentY);
      this.currentY += 6;

      this.addObjectsList(positiveObjects, PDF_CONFIG.colors.success);
    }

    if (negativeObjects.length > 0) {
      const negativeLabel = language === 'ru' ? 'Проблемы:' : 'Issues:';
      this.pdf.setFontSize(PDF_CONFIG.fontSize.body);
      this.pdf.setTextColor(PDF_CONFIG.colors.error);
      this.pdf.text(negativeLabel, this.margin + 5, this.currentY);
      this.currentY += 6;

      this.addObjectsList(negativeObjects, PDF_CONFIG.colors.error);
    }

    this.currentY += 10;
  }

  /**
   * Add list of detected objects
   */
  private addObjectsList(objects: DetectedObject[], color: string): void {
    this.pdf.setFontSize(PDF_CONFIG.fontSize.small);
    this.pdf.setTextColor(color);

    for (const obj of objects.slice(0, 10)) { // Limit to 10 objects
      const text = `• ${obj.class} - ${obj.count} шт. (${(obj.confidence * 100).toFixed(0)}%)`;
      this.pdf.text(text, this.margin + 10, this.currentY);
      this.currentY += 4;
    }

    if (objects.length > 10) {
      this.pdf.text(`... и еще ${objects.length - 10} объектов`, this.margin + 10, this.currentY);
      this.currentY += 4;
    }
  }

  /**
   * Add summary section
   */
  private addSummarySection(
    result: AssessmentResult,
    config: PDFReportConfig,
    language: 'ru' | 'en'
  ): void {
    if (this.currentY > this.pageHeight - 40) {
      this.addNewPage();
    }

    const sectionTitle = language === 'ru' ? 'Сводка:' : 'Summary:';

    this.pdf.setFontSize(PDF_CONFIG.fontSize.heading);
    this.pdf.setTextColor(PDF_CONFIG.colors.primary);
    this.pdf.text(sectionTitle, this.margin, this.currentY);
    this.currentY += 8;

    // Aggregated comment
    this.pdf.setFontSize(PDF_CONFIG.fontSize.body);
    this.pdf.setTextColor(PDF_CONFIG.colors.text);
    const commentLines = this.pdf.splitTextToSize(
      result.aggregatedComment,
      this.pageWidth - 2 * this.margin
    );
    this.pdf.text(commentLines, this.margin, this.currentY);
    this.currentY += commentLines.length * 5 + 10;
  }

  /**
   * Add footer with metadata
   */
  private addFooter(config: PDFReportConfig, language: 'ru' | 'en'): void {
    const footerY = this.pageHeight - 15;
    const footerText = language === 'ru'
      ? 'Создано автоматически системой Тайный Гость'
      : 'Generated automatically by Secret Guest system';

    this.pdf.setFontSize(PDF_CONFIG.fontSize.small);
    this.pdf.setTextColor(PDF_CONFIG.colors.secondary);
    this.pdf.text(footerText, this.margin, footerY);

    const pageText = language === 'ru' ? 'Страница 1' : 'Page 1';
    this.pdf.text(
      pageText,
      this.pageWidth - this.margin - 15,
      footerY
    );
  }

  /**
   * Add star rating visualization
   */
  private addStarRating(x: number, y: number, rating: number): void {
    const starSize = 3;
    const spacing = 4;

    for (let i = 0; i < 5; i++) {
      const starX = x + i * spacing;
      const filled = i < Math.round(rating);

      if (filled) {
        this.pdf.setFillColor(PDF_CONFIG.colors.warning);
        this.pdf.star(starX, y, starSize, starSize, 5, 0.5, 'F');
      } else {
        this.pdf.setDrawColor(PDF_CONFIG.colors.secondary);
        this.pdf.star(starX, y, starSize, starSize, 5, 0.5, 'S');
      }
    }
  }

  /**
   * Add new page
   */
  private addNewPage(): void {
    this.pdf.addPage();
    this.currentY = this.margin;
  }

  /**
   * Add watermark
   */
  private addWatermark(language: 'ru' | 'en'): void {
    const watermarkText = language === 'ru' ? 'ДЕМО ВЕРСИЯ' : 'DEMO VERSION';
    
    this.pdf.setGState(new this.pdf.GState({ opacity: 0.1 }));
    this.pdf.setFontSize(60);
    this.pdf.setTextColor(150, 150, 150);
    this.pdf.text(
      watermarkText,
      this.pageWidth / 2,
      this.pageHeight / 2,
      { angle: 45, align: 'center' }
    );
    this.pdf.setGState(new this.pdf.GState({ opacity: 1 }));
  }

  /**
   * Get color based on score
   */
  private getScoreColor(score: number): string {
    if (score >= 4.5) return PDF_CONFIG.colors.success;
    if (score >= 3.5) return PDF_CONFIG.colors.primary;
    if (score >= 2.5) return PDF_CONFIG.colors.warning;
    return PDF_CONFIG.colors.error;
  }

  /**
   * Get score description
   */
  private getScoreDescription(score: number, language: 'ru' | 'en'): string {
    if (language === 'ru') {
      if (score >= 4.5) return 'Отлично';
      if (score >= 3.5) return 'Хорошо';
      if (score >= 2.5) return 'Удовлетворительно';
      if (score >= 1.5) return 'Плохо';
      return 'Очень плохо';
    } else {
      if (score >= 4.5) return 'Excellent';
      if (score >= 3.5) return 'Good';
      if (score >= 2.5) return 'Satisfactory';
      if (score >= 1.5) return 'Poor';
      return 'Very Poor';
    }
  }

  /**
   * Generate and download PDF
   */
  async generateAndDownload(
    result: AssessmentResult,
    options: PDFGenerationOptions = {}
  ): Promise<void> {
    try {
      const pdfBlob = await this.generateReport(result, options);
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `secret-guest-report-${result.zoneId}-${Date.now()}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate and download PDF:', error);
      throw error;
    }
  }
}

// Singleton instance
let pdfGeneratorInstance: PDFReportGenerator | null = null;

export const getPDFGenerator = (): PDFReportGenerator => {
  if (!pdfGeneratorInstance) {
    pdfGeneratorInstance = new PDFReportGenerator();
  }
  return pdfGeneratorInstance;
};