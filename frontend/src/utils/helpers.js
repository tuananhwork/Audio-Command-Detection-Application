export const getConfidenceClass = (confidence) => {
  if (confidence >= 0.8) return 'confidence--high';
  if (confidence >= 0.6) return 'confidence--medium';
  return 'confidence--low';
};

export const getPredictionClass = (predictedClass, confidence) => {
  if (predictedClass === 'unknown') return 'prediction__command--unknown';
  return getConfidenceClass(confidence);
};

export const getCommandStatusText = (result) => {
  if (!result?.data?.command_status) return null;

  const getConnectionErrorText = () => {
    return (
      'Cannot connect to device. Please check:\n' +
      '1. Is the device powered on?\n' +
      '2. Is the device IP address correct?\n' +
      '3. Is there network connectivity between computer and device?'
    );
  };

  switch (result.data.command_status) {
    case 'SENT':
      return '✅ Command sent successfully';
    case 'ERROR':
      if (result.data.command_error) {
        if (result.data.command_error.includes('Connection to') && result.data.command_error.includes('timed out')) {
          return getConnectionErrorText();
        }
        return `⚠️ ${result.data.command_error}`;
      }
      return '❌ Cannot send command to device';
    case 'NOT_SENT':
      return `⚠️ ${result.data.command_reason || 'Command not sent'}`;
    default:
      return null;
  }
};

export const getErrorMessage = (err) => {
  if (err.code === 'ERR_NETWORK') {
    return 'Cannot connect to server. Please check your connection or try again later.';
  }

  if (err.response) {
    if (err.response.data?.command_error) {
      if (
        err.response.data.command_error.includes('Connection to') &&
        err.response.data.command_error.includes('timed out')
      ) {
        return getConnectionErrorText();
      }
      return err.response.data.command_error;
    }
    return err.response.data?.detail || err.response.data?.message || err.message;
  }

  return 'An error occurred while processing audio';
};
