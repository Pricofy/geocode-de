/**
 * Performance test script for pricofy-geocode-es Lambda
 * Measures total response time including network latency
 */

import { GeocodeESClient } from './client';

const client = new GeocodeESClient();

async function runPerformanceTests() {
  console.log(`🚀 Testing Lambda: ${process.env.LAMBDA_FUNCTION_NAME || 'pricofy-geocode-es'}`);
  console.log(`📍 Region: ${process.env.AWS_REGION || 'eu-west-1'}\n`);

  const results: number[] = [];

  // Test 1: First invocation (may be cold start)
  console.log('=== Invocación 1 (puede ser cold start) ===');
  const start1 = Date.now();
  const response1 = await client.geocodeByPostal('28001');
  const duration1 = Date.now() - start1;
  console.log(`Tiempo total: ${duration1}ms`);
  console.log(`Status: ${response1.statusCode}`);
  console.log(`Success: ${response1.body.success}\n`);
  results.push(duration1);

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Tests 2-4: Warm invocations
  for (let i = 2; i <= 4; i++) {
    console.log(`=== Invocación ${i} (warm) ===`);
    const start = Date.now();
    const response = await client.geocodeByPostal('28001');
    const duration = Date.now() - start;
    console.log(`Tiempo total: ${duration}ms`);
    console.log(`Status: ${response.statusCode}`);
    console.log(`Success: ${response.body.success}\n`);
    results.push(duration);
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('=== Resumen ===');
  const coldStart = results[0];
  const warmInvocations = results.slice(1);
  const avgWarm = warmInvocations.reduce((sum, r) => sum + r, 0) / warmInvocations.length;
  const minWarm = Math.min(...warmInvocations);
  const maxWarm = Math.max(...warmInvocations);

  console.log(`Cold start (1ra invocación): ${coldStart}ms`);
  console.log(`Warm invocations:`);
  console.log(`  - Promedio: ${avgWarm.toFixed(2)}ms`);
  console.log(`  - Mínimo: ${minWarm}ms`);
  console.log(`  - Máximo: ${maxWarm}ms`);
  console.log(`\n⚠️  Nota: Estos tiempos incluyen latencia de red AWS`);
  console.log(`💡 Para tiempos solo de Lambda, revisa CloudWatch Logs`);
}

runPerformanceTests().catch(console.error);
