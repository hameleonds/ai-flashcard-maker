import * as pdfjsLib from 'pdfjs-dist';

// Змінюємо налаштування воркера
pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/build/pdf.worker.entry');

interface Flashcard {
  question: string;
  options: string[];
  correctAnswer: number;
}

// Оновлена функція стиснення
async function compressImage(dataUrl: string, maxSizeKB: number = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('Failed to load image'));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // Ensure reasonable dimensions
      const maxDimension = 1024;
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      // Ensure minimum dimensions
      const minDimension = 100;
      if (width < minDimension || height < minDimension) {
        const ratio = Math.max(minDimension / width, minDimension / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Optimize rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      // Start with high quality and gradually reduce if needed
      let quality = 0.95;
      let result = canvas.toDataURL('image/jpeg', quality);
      
      while (result.length > maxSizeKB * 1024 && quality > 0.5) {
        quality -= 0.05;
        result = canvas.toDataURL('image/jpeg', quality);
      }

      resolve(result);
    };
    img.src = dataUrl;
  });
}

export async function convertPdfToImages(file: File): Promise<string[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // Increased scale for better quality
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) throw new Error('Failed to get canvas context');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport,
        background: 'white'
      }).promise;

      try {
        const compressedImage = await compressImage(canvas.toDataURL('image/jpeg', 1.0), 500);
        images.push(compressedImage);
      } catch (error) {
        console.error(`Error compressing page ${i}:`, error);
        // Continue with next page if one fails
        continue;
      }
    }

    if (images.length === 0) {
      throw new Error('No images were successfully extracted from the PDF');
    }

    return images;
  } catch (error) {
    console.error('Error converting PDF:', error);
    throw error;
  }
}

export async function extractTextFromImages(images: string[]): Promise<string> {
  try {
    const response = await fetch('/api/vision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ images }),
    });

    if (!response.ok) {
      throw new Error('Failed to extract text from images');
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error extracting text:', error);
    throw error;
  }
}

export async function generateFlashcards(text: string): Promise<Flashcard[]> {
  try {
    const response = await fetch('/api/flashcards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate flashcards');
    }

    const data = await response.json();
    return data.flashcards;
  } catch (error) {
    console.error('Error generating flashcards:', error);
    throw error;
  }
}