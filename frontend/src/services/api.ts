import type { InspectionResult, HistoryRecord, HealthStatus } from '../types/inspection';

const API_BASE = '/api';
const LOCAL_STORAGE_HISTORY_KEY = 'spasthascan_history_records';

export async function checkBackendHealth(): Promise<HealthStatus> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) {
      throw new Error(`Health check failed with status: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.warn('Backend health check error:', error);
    return {
      status: 'offline',
      service: 'SpasthaScan (Disconnected)',
      timestamp: new Date().toISOString(),
      vision_ai_enabled: false,
      ocr_available: false,
      max_upload_size_mb: 25,
      supported_formats: ['JPG', 'JPEG', 'PNG', 'WEBP']
    };
  }
}

export async function inspectDocumentImage(
  file: File,
  onProgress?: (percent: number) => void
): Promise<InspectionResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.open('POST', `${API_BASE}/inspect`);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as InspectionResult;
          // Also persist locally in browser storage
          saveInspectionToLocal(file.name, data);
          resolve(data);
        } catch {
          reject(new Error('Failed to parse inspection JSON response.'));
        }
      } else {
        try {
          const errorJson = JSON.parse(xhr.responseText);
          reject(new Error(errorJson.detail || `Server error: ${xhr.statusText}`));
        } catch {
          reject(new Error(`Inspection request failed: ${xhr.status} ${xhr.statusText}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error connecting to SpasthaScan backend. Please verify server is running.'));
    };

    xhr.send(formData);
  });
}

export async function getRotatedPreviewUrl(file: File, degrees: number): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/rotate-preview?degrees=${degrees}`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Failed to rotate preview');
  }

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function enhanceDocumentImage(file: File, mode: 'clarity' | 'bw_scan' = 'clarity'): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/enhance?mode=${mode}`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Failed to enhance image');
  }

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function fetchServerHistory(): Promise<HistoryRecord[]> {
  try {
    const res = await fetch(`${API_BASE}/history`);
    if (res.ok) {
      const serverHistory = await res.json();
      if (Array.isArray(serverHistory) && serverHistory.length > 0) {
        return serverHistory;
      }
    }
  } catch (err) {
    console.debug('Server history unavailable, fallback to local storage:', err);
  }
  return getLocalHistory();
}

export function saveInspectionToLocal(filename: string, result: InspectionResult): void {
  try {
    const records = getLocalHistory();
    const newRecord: HistoryRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      timestamp: result.timestamp || new Date().toISOString(),
      filename: filename || result.filename || 'document.jpg',
      document_type: result.document_type,
      document_category: result.document_category || (result.is_document ? 'General Document' : 'Non-Document'),
      is_document: result.is_document,
      main_text_readable: result.main_text_readable,
      is_cropped: result.is_cropped,
      background_clutter: result.background_clutter,
      analysis_status: result.analysis_status,
      feedback: result.feedback,
      recommended_fix: result.recommended_fix,
      readability_confidence: result.readability_confidence,
      rotation_clockwise: result.rotation_clockwise,
      results: result,
    };
    records.unshift(newRecord);
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(records.slice(0, 50)));
  } catch (err) {
    console.warn('Failed to save history to localStorage', err);
  }
}

export function getLocalHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to read history from localStorage', err);
  }
  return [];
}

export function clearLocalHistory(): void {
  localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY);
}
