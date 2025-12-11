import { useEffect, useRef, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Handles selecting or dragging files and streams them to the backend for parsing
function FileUpload({ onFileUpload }) {
  const [status, setStatus] = useState('No file selected');
  const [fileMeta, setFileMeta] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef(null);
  const previewUrlRef = useRef(null);

  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];
  const maxSizeInBytes = 10 * 1024 * 1024;

  const formatFileSize = (bytes) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
  };

  useEffect(() => {
    return () => {
      previewUrlRef.current = null;
    };
  }, []);

  const readFileAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const [, base64 = ''] = String(result).split(',');
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const uploadToBackend = async (file) => {
    setIsUploading(true);
    setStatus('Uploading to server...');
    try {
      const fileContent = await readFileAsBase64(file);
      const response = await fetch(`${API_BASE_URL}/files/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileContent,
        }),
      });

      if (!response.ok) {
        throw new Error('Backend rejected file upload');
      }

      const data = await response.json();
      setStatus('File ready for chat');
      setFileMeta({
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type || 'Unknown',
      });

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      previewUrlRef.current = URL.createObjectURL(file);

      onFileUpload?.({
        name: file.name,
        size: file.size,
        type: file.type,
        parsedText: data.fileText,
        anchors: data.anchors || [],
        previewUrl: previewUrlRef.current,
        originalFile: file,
      });
    } catch (error) {
      console.error('File upload failed', error);
      setStatus('Upload failed. Please try again.');
      setFileMeta(null);
    } finally {
      setIsUploading(false);
    }
  };

  const validateAndUpload = (file) => {
    if (!file) return;

    if (!allowedTypes.includes(file.type)) {
      setStatus('Unsupported file type');
      return;
    }

    if (file.size > maxSizeInBytes) {
      setStatus('File exceeds 10 MB limit');
      return;
    }

    uploadToBackend(file);
  };

  const handleInputChange = (event) => {
    const [file] = event.target.files || [];
    validateAndUpload(file);
    event.target.value = '';
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const [file] = event.dataTransfer.files || [];
    validateAndUpload(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  return (
    <div className="file-upload" onDragOver={handleDragOver} onDrop={handleDrop}>
      <div className="file-upload__dropzone">
        <div className="file-upload__icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" role="presentation">
            <path
              d="M24 32V12m0 0-6 6m6-6 6 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 32v4a4 4 0 0 0 4 4h16a4 4 0 0 0 4-4v-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="file-upload__title">Drag & drop your PDF, Word, or Text file here</p>
        <p className="file-upload__subtitle">Maximum size: 10 MB</p>
        <button
          type="button"
          className="file-upload__button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? 'Uploading...' : 'Choose File'}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        onChange={handleInputChange}
      />
      <div className="file-upload__status">
        <span className="file-upload__status-label">{status}</span>
        {fileMeta && (
          <div className="file-upload__status-meta">
            <span>{fileMeta.name}</span>
            <span>{fileMeta.size}</span>
            <span>{fileMeta.type}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default FileUpload;
