import { NextResponse } from 'next/server';
import vision from '@google-cloud/vision';

// Оновлена функція для конвертації base64 в Buffer
function base64ToBuffer(base64: string) {
  try {
    // Remove data URL prefix if present
    const base64Data = base64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
    
    // Basic validation of base64 string
    if (!base64Data || typeof base64Data !== 'string') {
      throw new Error('Invalid base64 string');
    }

    // Create buffer from base64
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Ensure minimum size
    if (buffer.length < 100) {
      throw new Error('Image data too small');
    }

    return buffer;
  } catch (error) {
    console.error('Error converting base64 to buffer:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const { images } = await request.json();
    
    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    const client = new vision.ImageAnnotatorClient({
      credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '{}'),
    });

    const texts = await Promise.all(
      images.map(async (image: string, index: number) => {
        try {
          if (!image) {
            console.error(`Empty image data at index ${index}`);
            return '';
          }

          const imageBuffer = base64ToBuffer(image);

          // Request with explicit image format
          const [result] = await client.textDetection({
            image: {
              content: imageBuffer,
            },
            imageContext: {
              languageHints: ['en'],
            }
          });
          
          if (!result.fullTextAnnotation?.text) {
            console.warn(`No text detected in image at index ${index}`);
            return '';
          }
          
          return result.fullTextAnnotation.text;
        } catch (error) {
          console.error(`Error processing image at index ${index}:`, error);
          return '';
        }
      })
    );

    const combinedText = texts.filter(text => text).join('\n');
    
    if (!combinedText) {
      return NextResponse.json(
        { error: 'No text could be extracted from any of the provided images' },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: combinedText });
  } catch (error) {
    console.error('Vision API error:', error);
    return NextResponse.json(
      { error: 'Failed to process images: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    return NextResponse.json(
      {
        success: true,
        message: 'Vision API endpoint is operational',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('GET endpoint error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Vision API endpoint error',
        error: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}