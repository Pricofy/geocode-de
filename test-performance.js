/**
 * Performance test script for pricofy-geocode-es Lambda
 * Measures total response time including network latency
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const client = new LambdaClient({ region: process.env.AWS_REGION || 'eu-west-1' });
const functionName = process.env.LAMBDA_FUNCTION_NAME || 'pricofy-geocode-es-dev';

async function invokeLambda(operation, payload) {
  const startTime = Date.now();
  
  const command = new InvokeCommand({
    FunctionName: functionName,
    Payload: JSON.stringify({ body: JSON.stringify(payload) }),
  });

  const response = await client.send(command);
  const duration = Date.now() - startTime;

  const result = JSON.parse(new TextDecoder().decode(response.Payload));
  
  return {
    duration,
    statusCode: result.statusCode,
    success: result.statusCode === 200,
  };
}

async function runTests() {
  console.log(`🚀 Testing Lambda: ${functionName}`);
  console.log(`📍 Region: ${process.env.AWS_REGION || 'eu-west-1'}\n`);

  const results = [];

  // Test 1: First invocation (may be cold start)
  console.log('=== Invocación 1 (puede ser cold start) ===');
  const result1 = await invokeLambda('geocode-by-postal', { postalCode: '28001' });
  console.log(`Tiempo total: ${result1.duration}ms`);
  console.log(`Status: ${result1.statusCode}\n`);
  results.push(result1);

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Tests 2-4: Warm invocations
  for (let i = 2; i <= 4; i++) {
    console.log(`=== Invocación ${i} (warm) ===`);
    const result = await invokeLambda('geocode-by-postal', { postalCode: '28001' });
    console.log(`Tiempo total: ${result.duration}ms`);
    console.log(`Status: ${result.statusCode}\n`);
    results.push(result);
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('=== Resumen ===');
  const coldStart = results[0].duration;
  const warmInvocations = results.slice(1);
  const avgWarm = warmInvocations.reduce((sum, r) => sum + r.duration, 0) / warmInvocations.length;
  const minWarm = Math.min(...warmInvocations.map(r => r.duration));
  const maxWarm = Math.max(...warmInvocations.map(r => r.duration));

  console.log(`Cold start (1ra invocación): ${coldStart}ms`);
  console.log(`Warm invocations:`);
  console.log(`  - Promedio: ${avgWarm.toFixed(2)}ms`);
  console.log(`  - Mínimo: ${minWarm}ms`);
  console.log(`  - Máximo: ${maxWarm}ms`);
  console.log(`\n⚠️  Nota: Estos tiempos incluyen latencia de red AWS`);
}

runTests().catch(console.error);
