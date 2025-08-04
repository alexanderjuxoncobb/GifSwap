interface BackendError {
  error: string;
  details: string;
  errorType: string;
}

interface ErrorInfo {
  type: string;
  title: string;
  message: string;
  action?: string;
}

export const parseError = async (response: Response): Promise<ErrorInfo> => {
  try {
    const errorData: BackendError = await response.json();
    
    // Use backend error type if available, otherwise determine from status
    const errorType = errorData.errorType || getErrorTypeFromStatus(response.status);
    
    return {
      type: errorType,
      title: getErrorTitle(errorType, errorData.error),
      message: getErrorMessage(errorType, errorData.details),
      action: getErrorAction(errorType)
    };
  } catch {
    // Fallback for non-JSON responses
    const errorType = getErrorTypeFromStatus(response.status);
    return {
      type: errorType,
      title: getErrorTitle(errorType, response.statusText),
      message: getErrorMessage(errorType, `HTTP ${response.status}: ${response.statusText}`),
      action: getErrorAction(errorType)
    };
  }
};

export const parseGenericError = (error: Error | unknown): ErrorInfo => {
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
  
  // Try to detect error type from message
  let errorType = 'unknown_error';
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    errorType = 'network_error';
  } else if (errorMessage.includes('timeout')) {
    errorType = 'timeout_error';
  }
  
  return {
    type: errorType,
    title: getErrorTitle(errorType, 'Error'),
    message: getErrorMessage(errorType, errorMessage),
    action: getErrorAction(errorType)
  };
};

const getErrorTypeFromStatus = (status: number): string => {
  switch (status) {
    case 401: return 'auth_error';
    case 402: return 'payment_required';
    case 403: return 'access_denied';
    case 404: return 'file_not_found';
    case 408: return 'timeout_error';
    case 413: return 'file_too_large';
    case 422: return 'animation_error';
    case 429: return 'rate_limit';
    case 503: return 'network_error';
    case 507: return 'memory_error';
    default: return 'unknown_error';
  }
};

const getErrorTitle = (errorType: string, fallback: string): string => {
  switch (errorType) {
    case 'payment_required': return 'Insufficient Credits';
    case 'auth_error': return 'Authentication Error';
    case 'rate_limit': return 'Too Many Requests';
    case 'network_error': return 'Network Connection Error';
    case 'file_not_found': return 'File Not Found';
    case 'access_denied': return 'Access Denied';
    case 'file_too_large': return 'File Too Large';
    case 'invalid_format': return 'Invalid File Format';
    case 'corrupted_file': return 'Corrupted File';
    case 'memory_error': return 'Processing Error';
    case 'animation_error': return 'Animation Processing Error';
    case 'timeout_error': return 'Processing Timeout';
    case 'model_error': return 'AI Model Error';
    case 'bad_request': return 'Invalid Request';
    default: return fallback || 'Error';
  }
};

const getErrorMessage = (errorType: string, details: string): string => {
  // If details already contain a user-friendly message, use it
  if (details && details.length > 10 && !details.startsWith('HTTP')) {
    return details;
  }
  
  // Otherwise, provide user-friendly defaults
  switch (errorType) {
    case 'payment_required': 
      return 'You need to add credits to your Replicate account to continue using the face swap feature.';
    case 'auth_error': 
      return 'There was an authentication issue with the AI service. Please try again later.';
    case 'rate_limit': 
      return 'You\'ve made too many requests recently. Please wait a few minutes before trying again.';
    case 'network_error': 
      return 'Unable to connect to the service. Please check your internet connection and try again.';
    case 'file_not_found': 
      return 'The GIF file could not be found. It may have been moved or deleted.';
    case 'access_denied': 
      return 'Access to the file was denied. The file may be private or protected.';
    case 'file_too_large': 
      return 'The file is too large to process. Please try with a smaller GIF (under 50MB).';
    case 'invalid_format': 
      return 'The file format is not supported. Please upload a valid GIF, PNG, or JPEG file.';
    case 'corrupted_file': 
      return 'The file appears to be corrupted or damaged. Please try with a different file.';
    case 'memory_error': 
      return 'The file is too complex to process. Please try with a smaller or simpler GIF.';
    case 'animation_error': 
      return 'There was an issue processing the animated frames. Please try with a different GIF.';
    case 'timeout_error': 
      return 'The processing took too long and timed out. Please try with a smaller file.';
    case 'model_error': 
      return 'The AI model encountered an error. Please try again with different images.';
    case 'bad_request': 
      return 'The request was invalid. Please check your inputs and try again.';
    default: 
      return details || 'An unexpected error occurred. Please try again.';
  }
};

const getErrorAction = (errorType: string): string | undefined => {
  switch (errorType) {
    case 'payment_required': 
      return 'Go to Replicate.com → Account → Billing to add credits, then try again.';
    case 'auth_error': 
      return 'Contact support if this issue persists.';
    case 'rate_limit': 
      return 'Wait 5-10 minutes before making another request.';
    case 'network_error': 
      return 'Check your internet connection and ensure the server is running.';
    case 'file_not_found': 
      return 'Try using a different GIF URL or upload a new file.';
    case 'access_denied': 
      return 'Try using a different GIF URL that is publicly accessible.';
    case 'file_too_large': 
      return 'Resize or compress your GIF to under 50MB and try again.';
    case 'invalid_format': 
      return 'Convert your file to GIF, PNG, or JPEG format and try again.';
    case 'corrupted_file': 
      return 'Download a fresh copy of the file or try a different file.';
    case 'memory_error': 
      return 'Try with a GIF that has fewer frames or smaller dimensions.';
    case 'animation_error': 
      return 'Try with a different animated GIF or reduce the number of frames.';
    case 'timeout_error': 
      return 'Try with a smaller file or check your internet connection.';
    case 'model_error': 
      return 'Try with different face images or GIFs, or contact support.';
    default: 
      return undefined;
  }
}; 