import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('Global setup: Starting test environment...');
  
  // Verify servers are running
  const goApiUrl = process.env.NEXT_PUBLIC_GO_API_URL || 'http://localhost:8080';
  const webApiUrl = 'http://localhost:3000';
  
  try {
    const goResponse = await fetch(`${goApiUrl}/health`);
    if (!goResponse.ok) {
      throw new Error(`Go API health check failed: ${goResponse.status}`);
    }
    console.log('✓ Go API is healthy');
  } catch (error) {
    console.error('✗ Go API health check failed:', error);
    throw error;
  }
  
  try {
    const webResponse = await fetch(`${webApiUrl}/api/health`);
    if (!webResponse.ok) {
      throw new Error(`Web API health check failed: ${webResponse.status}`);
    }
    console.log('✓ Web API is healthy');
  } catch (error) {
    console.error('✗ Web API health check failed:', error);
    throw error;
  }
  
  console.log('Global setup complete');
}

export default globalSetup;