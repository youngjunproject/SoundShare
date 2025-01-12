import React, { useState, useRef } from 'react';
import { Layout } from '../components/Layout';
import { Upload as UploadIcon, X, Music } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export function Upload() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();

  const audioMimeTypes: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/x-wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.webm': 'audio/webm'
  };

  const getAudioMimeType = (fileName: string): string => {
    const ext = fileName.toLowerCase().match(/\.[^.]*$/)?.[0] || '';
    return audioMimeTypes[ext] || 'audio/mpeg';
  };

  const validateFile = (file: File) => {
    if (file.size > 100 * 1024 * 1024) {
      throw new Error('Audio file size must be less than 100MB');
    }
    const ext = file.name.toLowerCase().match(/\.[^.]*$/)?.[0] || '';
    if (!audioMimeTypes[ext]) {
      throw new Error('Unsupported audio format. Supported formats are: MP3, WAV, OGG, M4A, AAC, WEBM');
    }
  };

  const handleFileSelect = (file: File) => {
    try {
      validateFile(file);
      const mimeType = getAudioMimeType(file.name);
      const newFile = new File([file], file.name, {
        type: mimeType
      });
      setAudioFile(newFile);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid file');
      setAudioFile(null);
    }
  };

  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage
      .from('audio')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;
    return data.path;
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage
      .from('audio')
      .getPublicUrl(path);
    return data.publicUrl;
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    if (!audioFile) {
      setError('Please select an audio file');
      return;
    }

    setIsUploading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to upload sounds');
      }

      const cleanFileName = (originalName: string) => {
        const timestamp = Date.now();
        const cleanName = originalName.replace(/[^a-zA-Z0-9.]/g, '_').toLowerCase();
        return `${user.id}/${timestamp}_${cleanName}`;
      };

      const audioPath = cleanFileName(audioFile.name);
      await uploadFile(audioFile, audioPath);
      const audioUrl = getPublicUrl(audioPath);

      setUploadProgress(75);

      const { error: dbError } = await supabase.from('sounds').insert([
        {
          title,
          description,
          audio_url: audioUrl,
          user_id: user.id,
          mime_type: audioFile.type,
          file_size: audioFile.size,
          processed: true,
          processing_status: 'completed'
        },
      ]);

      if (dbError) throw dbError;

      setUploadProgress(100);
      formRef.current?.reset();
      setAudioFile(null);
      navigate('/');
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Error uploading sound. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Upload Sound</h1>
            <Music className="h-8 w-8 text-indigo-600" />
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form ref={formRef} onSubmit={handleUpload} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Enter sound title"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Describe your sound..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Audio File
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  {audioFile ? (
                    <div className="flex items-center justify-center space-x-2">
                      <Music className="h-8 w-8 text-indigo-600" />
                      <div className="flex-1 text-sm text-gray-600">
                        {audioFile.name}
                      </div>
                      <button
                        type="button"
                        onClick={() => setAudioFile(null)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="audio-file"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                        >
                          <span>Upload audio file</span>
                          <input
                            id="audio-file"
                            type="file"
                            className="sr-only"
                            accept=".mp3,.wav,.ogg,.m4a,.aac,.webm"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileSelect(file);
                            }}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">
                        MP3, WAV, OGG, M4A, AAC, WEBM up to 100MB
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {isUploading && (
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block text-indigo-600">
                      Uploading...
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-indigo-600">
                      {uploadProgress}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-200">
                  <div
                    style={{ width: `${uploadProgress}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600 transition-all duration-300"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUploading}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <UploadIcon className="h-4 w-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Upload Sound'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}