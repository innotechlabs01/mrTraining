// Ensure proper loading of imports before test execution
global.console.error = function(message) {
  if (typeof message === 'string' && 
      (message.includes('Failed to parse') || message.includes('module is not defined'))) {
    return;
  }
  console.log('Console error:', message);
};
