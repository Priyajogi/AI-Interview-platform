// server/services/whisperService.js
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class WhisperService {
  constructor() {
    // Options for different Whisper implementations
    this.options = {
      // Option 1: Use whisper.cpp (recommended)
      useWhisperCpp: false,
      whisperCppPath: './whisper.cpp/main',
      
      // Option 2: Use Python whisper (if Python installed)
      usePythonWhisper: true,
      pythonCommand: 'whisper',
      
      // Option 3: Mock mode for testing
      useMock: true
    };
  }

  /**
   * Main transcription method
   */
  async transcribeAudio(audioPath, language = 'en') {
    try {
      if (this.options.useMock) {
        return await this.mockTranscription();
      }
      
      if (this.options.useWhisperCpp) {
        return await this.transcribeWithWhisperCpp(audioPath, language);
      }
      
      if (this.options.usePythonWhisper) {
        return await this.transcribeWithPythonWhisper(audioPath, language);
      }
      
      throw new Error('No transcription method configured');
      
    } catch (error) {
      console.error('Transcription failed, using fallback:', error);
      return await this.mockTranscription();
    }
  }

  /**
   * Method 1: Use Python OpenAI Whisper
   */
  async transcribeWithPythonWhisper(audioPath, language) {
    return new Promise((resolve, reject) => {
      // Convert to WAV if needed
      const wavPath = this.convertToWavIfNeeded(audioPath);
      
      const command = `whisper "${wavPath}" --language ${language} --model base --output_format json`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Python Whisper error: ${stderr}`));
          return;
        }
        
        try {
          // Parse JSON output
          const result = JSON.parse(stdout);
          resolve({
            text: result.text,
            language: result.language,
            duration: result.duration
          });
        } catch {
          // Fallback to text extraction
          resolve({
            text: this.extractText(stdout),
            language: language,
            duration: 0
          });
        }
      });
    });
  }

  /**
   * Method 2: Mock transcription (for testing)
   */
  async mockTranscription() {
    const responses = [
      "A process is an instance of a program in execution, while a thread is a lightweight process that shares memory space with other threads.",
      "Deadlock occurs when multiple processes are waiting for each other's resources. Prevention methods include resource ordering and timeout mechanisms.",
      "The TCP/IP model consists of four layers: Application, Transport, Internet, and Network Access layers.",
      "Arrays provide constant-time access but have fixed size, while linked lists have dynamic size but linear-time access.",
      "Binary Search has O(log n) time complexity for sorted arrays and requires O(1) space for iterative implementation.",
      "SOLID principles in OOP include Single Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion.",
      "Normalization in databases reduces data redundancy and improves data integrity through various normal forms.",
      "A virtual function in C++ allows dynamic polymorphism and runtime method binding through base class pointers."
    ];
    
    return {
      text: responses[Math.floor(Math.random() * responses.length)],
      language: 'en',
      duration: Math.floor(Math.random() * 30) + 10, // 10-40 seconds
      isMock: true
    };
  }

  /**
   * Convert audio to WAV format if needed
   */
  convertToWavIfNeeded(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (['.wav', '.wave'].includes(ext)) {
      return filePath; // Already WAV
    }
    
    // For now, return as-is (Python whisper handles many formats)
    return filePath;
  }

  /**
   * Extract text from command output
   */
  extractText(output) {
    // Simple text extraction
    const lines = output.split('\n');
    return lines
      .filter(line => line && !line.startsWith('[') && !line.includes('-->'))
      .join(' ')
      .trim();
  }

  /**
   * Check if Whisper is available
   */
  async checkAvailability() {
    return new Promise((resolve) => {
      exec('whisper --help', (error) => {
        resolve(!error);
      });
    });
  }
}

module.exports = new WhisperService();