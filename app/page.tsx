'use client';

import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { convertPdfToImages, extractTextFromImages, generateFlashcards } from '@/utils/pdfUtils';

interface Flashcard {
  question: string;
  options: string[];
  correctAnswer: number;
}

export default function Home() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [groupName, setGroupName] = useState('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size should be less than 10MB');
      return;
    }

    setLoading(true);
    try {
      const images = await convertPdfToImages(file);
      setFile(file);
      setImages(images);
      setStep(2);
    } catch (error) {
      console.error('Error processing PDF:', error);
      alert('Error processing PDF file');
    }
    setLoading(false);
  };

  const handlePageSelection = (pageIndex: number) => {
    setSelectedPages(prev => 
      prev.includes(pageIndex)
        ? prev.filter(p => p !== pageIndex)
        : [...prev, pageIndex]
    );
  };

  const handleCreateFlashcards = async () => {
    if (!groupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    setLoading(true);
    try {
      const selectedImages = selectedPages.map(index => images[index]);
      const extractedText = await extractTextFromImages(selectedImages);
      const generatedFlashcards = await generateFlashcards(extractedText);
      setFlashcards(generatedFlashcards);
      setStep(4);
    } catch (error) {
      console.error('Error creating flashcards:', error);
      alert('Error creating flashcards');
    }
    setLoading(false);
  };

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center space-y-4"
            >
              <Upload className="w-12 h-12 text-gray-400" />
              <span className="text-blue-600">Click or drag file here</span>
              <p className="text-sm text-gray-500">Maximum file size: 10MB</p>
            </label>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Select Pages</h2>
            <div className="grid grid-cols-3 gap-4">
              {images.map((image, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 cursor-pointer ${
                    selectedPages.includes(index) ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => handlePageSelection(index)}
                >
                  <img
                    src={image}
                    alt={`Page ${index + 1}`}
                    className="w-full object-cover"
                  />
                </div>
              ))}
            </div>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
              onClick={() => setStep(3)}
              disabled={selectedPages.length === 0}
            >
              Continue
            </button>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Name Your Flashcard Group</h2>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter group name"
            />
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
              onClick={handleCreateFlashcards}
              disabled={loading || !groupName.trim()}
            >
              {loading ? 'Creating...' : 'Create Flashcards'}
            </button>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">{groupName}</h2>
            {flashcards.length > 0 && (
              <div className="border rounded-lg p-6 space-y-4">
                <p className="text-lg font-medium">{flashcards[currentCard].question}</p>
                <div className="space-y-2">
                  {flashcards[currentCard].options.map((option, index) => (
                    <button
                      key={index}
                      className={`w-full p-4 text-left rounded-lg border ${
                        selectedAnswer === null
                          ? 'hover:bg-gray-50'
                          : selectedAnswer === index
                          ? index === flashcards[currentCard].correctAnswer
                            ? 'bg-green-100 border-green-500'
                            : 'bg-red-100 border-red-500'
                          : ''
                      }`}
                      onClick={() => setSelectedAnswer(index)}
                      disabled={selectedAnswer !== null}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between mt-4">
                  <button
                    className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:text-gray-400"
                    onClick={() => {
                      setSelectedAnswer(null);
                      setCurrentCard(prev => Math.max(0, prev - 1));
                    }}
                    disabled={currentCard === 0}
                  >
                    Previous
                  </button>
                  <button
                    className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:text-gray-400"
                    onClick={() => {
                      setSelectedAnswer(null);
                      setCurrentCard(prev => Math.min(flashcards.length - 1, prev + 1));
                    }}
                    disabled={currentCard === flashcards.length - 1}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">AI Flashcard Maker</h1>
        {renderStep()}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-4 rounded-lg">Loading...</div>
          </div>
        )}
      </div>
    </main>
  );
}