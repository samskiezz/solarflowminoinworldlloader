# SolarFlow API Documentation

**Version**: 2.3.0  
**Last Updated**: 2026-02-08

---

## Core APIs

### Central Data Loader

#### Methods

**`init()`**
Initialize and load all core data.

```javascript
await centralDataLoader.init();
```

**Returns**: Promise\<void\>

---

**`get(key)`**
Get cached data synchronously.

```javascript
const minions = centralDataLoader.get('minions');
const products = centralDataLoader.get('cerProducts');
```

**Parameters**:
- `key` (string): Data key ('minions', 'cerProducts', 'standards', 'hiveState', 'progress')

**Returns**: Data object or null if not loaded

---

**`loadMinions()`**
Load minion roster.

```javascript
const minions = await centralDataLoader.loadMinions();
```

**Returns**: Promise\<Array\> - Array of minion objects

---

**`loadCERProducts()`**
Load CER product database.

```javascript
const products = await centralDataLoader.loadCERProducts();
```

**Returns**: Promise\<Array\> - Array of 9,247 CER products

---

**`subscribe(key, callback)`**
Subscribe to data changes.

```javascript
centralDataLoader.subscribe('minions', (data) => {
    console.log('Minions updated:', data.length);
});
```

**Parameters**:
- `key` (string): Data key to watch
- `callback` (function): Called when data changes

---

**`update(key, data)`**
Update cached data.

```javascript
centralDataLoader.update('minions', newMinions);
```

**Parameters**:
- `key` (string): Data key
- `data` (any): New data

---

**`getStatus()`**
Get loader status.

```javascript
const status = centralDataLoader.getStatus();
// {
//   initialized: true,
//   cached: ['minions', 'cerProducts'],
//   loading: [],
//   listeners: [...]
// }
```

**Returns**: Object with initialization status

---

### Unified Credit System

#### Methods

**`awardCredits(minionId, amount, reason, metadata)`**
Award credits to a minion.

```javascript
unifiedCreditSystem.awardCredits(
    'ATLAS',
    25,
    'Document Processing',
    { product: 'Fronius Primo' }
);
```

**Parameters**:
- `minionId` (string): Minion identifier (validated)
- `amount` (number): Credit amount 0-1,000,000 (validated)
- `reason` (string): Award reason
- `metadata` (object): Optional additional data

**Returns**: Credit record object or null if validation fails

**Validations**:
- Minion ID: alphanumeric, 2-50 chars
- Amount: 0-1,000,000, integer
- Rate limit: 60 awards/minute

---

**`getMinionCredits(minionId)`**
Get total credits for a minion.

```javascript
const credits = unifiedCreditSystem.getMinionCredits('ATLAS');
// 2450
```

**Returns**: Number (total credits)

---

**`getTotalCredits()`**
Get system-wide total credits.

```javascript
const total = unifiedCreditSystem.getTotalCredits();
// 54230
```

**Returns**: Number

---

**`getCreditHistory(minionId, limit)`**
Get credit award history.

```javascript
const history = unifiedCreditSystem.getCreditHistory('ATLAS', 50);
// [{ minionId, amount, reason, timestamp, metadata }, ...]
```

**Parameters**:
- `minionId` (string, optional): Filter by minion
- `limit` (number, optional): Max records (default: 100)

**Returns**: Array of credit records

---

**`getTopEarners(limit)`**
Get leaderboard of top earning minions.

```javascript
const top = unifiedCreditSystem.getTopEarners(10);
// [{ minionId: 'ATLAS', total: 2450 }, ...]
```

**Parameters**:
- `limit` (number): Number of results (default: 10)

**Returns**: Array sorted by total credits

---

**`getStats()`**
Get credit system statistics.

```javascript
const stats = unifiedCreditSystem.getStats();
// {
//   totalCredits: 54230,
//   totalTransactions: 247,
//   topEarners: [...],
//   byReason: {...}
// }
```

**Returns**: Statistics object

---

### Security Utils

#### Methods

**`sanitizeHTML(html)`**
Sanitize HTML to prevent XSS.

```javascript
const safe = securityUtils.sanitizeHTML('<script>alert("XSS")</script>');
// '&lt;script&gt;alert("XSS")&lt;/script&gt;'
```

**Returns**: Sanitized string

---

**`escapeHTML(text)`**
Escape HTML entities.

```javascript
const escaped = securityUtils.escapeHTML('A & B < C > D');
// 'A &amp; B &lt; C &gt; D'
```

**Returns**: Escaped string

---

**`validateMinionId(id)`**
Validate minion ID format.

```javascript
securityUtils.validateMinionId('ATLAS');        // true
securityUtils.validateMinionId('invalid id');   // false
securityUtils.validateMinionId('x');            // false (too short)
```

**Rules**:
- Type: string
- Length: 2-50 characters
- Format: `/^[a-zA-Z0-9_-]+$/`

**Returns**: Boolean

---

**`validateCreditAmount(amount)`**
Validate credit amount.

```javascript
securityUtils.validateCreditAmount(100);      // true
securityUtils.validateCreditAmount(-50);      // false
securityUtils.validateCreditAmount(2000000);  // false (too large)
```

**Rules**:
- Type: number
- Range: 0 to 1,000,000
- Must be finite

**Returns**: Boolean

---

**`validateProgress(progress)`**
Validate progress percentage.

```javascript
securityUtils.validateProgress(50);   // true
securityUtils.validateProgress(-10);  // false
securityUtils.validateProgress(150);  // false
```

**Rules**:
- Type: number
- Range: 0 to 100
- Must be finite

**Returns**: Boolean

---

**`safeLocalStorageSet(key, value, maxSizeKB)`**
Write to localStorage with size limit.

```javascript
const success = securityUtils.safeLocalStorageSet('key', data, 5000);
```

**Parameters**:
- `key` (string): Storage key
- `value` (any): Data to store
- `maxSizeKB` (number, optional): Max size in KB (default: 5000)

**Returns**: Boolean (success)

---

**`safeLocalStorageGet(key, validator)`**
Read from localStorage with validation.

```javascript
const data = securityUtils.safeLocalStorageGet('key', (val) => {
    return val && val.timestamp > Date.now() - 86400000; // Last 24h
});
```

**Parameters**:
- `key` (string): Storage key
- `validator` (function, optional): Validation function

**Returns**: Parsed data or null

---

**`logSecurityEvent(type, details)`**
Log security event.

```javascript
securityUtils.logSecurityEvent('rate-limit', {
    minionId: 'ATLAS',
    attempts: 100
});
```

**Parameters**:
- `type` (string): Event type
- `details` (object): Event details

---

**`getSecurityLog(limit)`**
Get security event log.

```javascript
const log = securityUtils.getSecurityLog(50);
```

**Returns**: Array of security events (last 100 max)

---

### Performance Monitor

#### Methods

**`measureAPICall(name, promise)`**
Measure API call performance.

```javascript
const data = await performanceMonitor.measureAPICall(
    'loadMinions',
    fetch('./minions.json')
);
```

**Parameters**:
- `name` (string): Operation name
- `promise` (Promise): Promise to measure

**Returns**: Promise result, logs duration

---

**`measureRender(name, fn)`**
Measure render performance.

```javascript
const result = performanceMonitor.measureRender('renderMinions', () => {
    // Render code
    return renderedData;
});
```

**Parameters**:
- `name` (string): Render operation name
- `fn` (function): Function to measure

**Returns**: Function result, logs duration

---

**`getSummary()`**
Get performance summary.

```javascript
const summary = performanceMonitor.getSummary();
// {
//   pageLoad: { dns: 5, tcp: 12, fullLoad: 1234 },
//   apiCalls: { total: 47, avgDuration: 123, slowCalls: 2 },
//   renders: { total: 156, avgDuration: 8.3, slowRenders: 3 },
//   memory: { used: '45.2 MB', percentage: '12.3%' },
//   slowOperations: 5
// }
```

**Returns**: Performance summary object

---

**`getMetrics()`**
Get detailed metrics.

```javascript
const metrics = performanceMonitor.getMetrics();
```

**Returns**: Full metrics object with all data points

---

**`optimizeLocalStorage()`**
Analyze and optimize localStorage.

```javascript
const report = performanceMonitor.optimizeLocalStorage();
// {
//   totalSizeKB: '450.23',
//   itemCount: 47,
//   largestItems: [...],
//   oldKeys: [...]
// }
```

**Returns**: Optimization report

---

**`debounce(fn, delay)`**
Create debounced function.

```javascript
const debouncedSave = performanceMonitor.debounce(() => {
    saveData();
}, 1000);
```

**Returns**: Debounced function

---

**`throttle(fn, limit)`**
Create throttled function.

```javascript
const throttledUpdate = performanceMonitor.throttle(() => {
    updateUI();
}, 100);
```

**Returns**: Throttled function

---

### Error Handler

#### Methods

**`handleError(error, context)`**
Manually log an error.

```javascript
errorHandler.handleError(new Error('Custom error'), {
    type: 'validation',
    minionId: 'ATLAS'
});
```

**Parameters**:
- `error` (Error|string): Error object or message
- `context` (object, optional): Additional context

---

**`getErrors(limit)`**
Get error log.

```javascript
const errors = errorHandler.getErrors(50);
```

**Returns**: Array of error records

---

**`getErrorStats()`**
Get error statistics.

```javascript
const stats = errorHandler.getErrorStats();
// {
//   total: 47,
//   last24h: 12,
//   topErrors: [{ message: '...', count: 8 }, ...]
// }
```

**Returns**: Error statistics object

---

**`createErrorBoundary(fn, fallback)`**
Wrap function in error boundary.

```javascript
const safeFn = errorHandler.createErrorBoundary(
    riskyFunction,
    (error) => {
        console.log('Error occurred, using fallback');
        return defaultValue;
    }
);
```

**Returns**: Wrapped function

---

**`wrapAsync(fn)`**
Wrap async function with error handling.

```javascript
const safeAsync = errorHandler.wrapAsync(async () => {
    const data = await fetchData();
    return processData(data);
});
```

**Returns**: Wrapped async function

---

### Real Health Monitor

#### Methods

**`getCurrentMetrics()`**
Get current health metrics.

```javascript
const metrics = realHealthMonitor.getCurrentMetrics();
// {
//   browser: {...},
//   performance: {...},
//   storage: {...},
//   network: {...},
//   features: {...},
//   system: {...},
//   healthScores: {...},
//   overallHealth: { score: 85, status: 'excellent', color: '#4caf50' }
// }
```

**Returns**: Complete health metrics object

---

**`getHistory()`**
Get metrics history.

```javascript
const history = realHealthMonitor.getHistory();
```

**Returns**: Array of historical metric snapshots (last 100)

---

**`getAlerts()`**
Get active health alerts.

```javascript
const alerts = realHealthMonitor.getAlerts();
// [{ type: 'warning', message: 'High memory usage: 92%', timestamp: ... }]
```

**Returns**: Array of alert objects

---

### Real Neural Processor

#### Methods

**`analyzeText(text)`**
Analyze text content.

```javascript
const result = await realNeuralProcessor.analyzeText('Solar panel efficiency optimization');
// {
//   wordCount: 4,
//   uniqueWords: 4,
//   complexity: 67,
//   themes: { solar: 1, technical: 1 },
//   sentiment: { score: 0, positive: 0, negative: 0 }
// }
```

**Returns**: Promise\<AnalysisResult\>

---

**`processDocument(document)`**
Process a document.

```javascript
const result = await realNeuralProcessor.processDocument({
    content: '440W, VOC 48.5V, ISC 11.2A',
    type: 'solar_spec'
});
// {
//   processed: true,
//   type: 'solar_spec',
//   extracted: { power: 440, voltage: 48.5, current: 11.2 }
// }
```

**Returns**: Promise\<ProcessResult\>

---

**`getMetrics()`**
Get neural processor metrics.

```javascript
const metrics = realNeuralProcessor.getMetrics();
// {
//   processedDocuments: 47,
//   analysisRequests: 123,
//   cacheHits: 45,
//   averageProcessingTime: 23.4,
//   successRate: 98.5,
//   workers: 4
// }
```

**Returns**: Metrics object

---

**`getStatus()`**
Get processor status.

```javascript
const status = realNeuralProcessor.getStatus();
// {
//   initialized: true,
//   processing: true,
//   workers: 4,
//   models: ['textAnalysis', 'documentProcessing'],
//   fallbackMode: false
// }
```

**Returns**: Status object

---

### Real Compliance Engine

#### Methods

**`verifySystem(systemData)`**
Verify system compliance.

```javascript
const result = await realComplianceEngine.verifySystem({
    electrical: {
        earthResistance: 0.3,
        insulationResistance: 2000000
    },
    solar: {
        dcIsolator: { distance: 2.5, accessible: true },
        arrayEarthing: { earthed: true, resistance: 0.4 }
    }
});
// {
//   id: 'COMP_1707368400_abc123',
//   timestamp: 1707368400000,
//   overallPass: true,
//   results: [...],
//   criticalIssues: [],
//   warnings: [],
//   recommendations: []
// }
```

**Returns**: Promise\<VerificationResult\>

---

**`getStandards()`**
Get loaded standards.

```javascript
const standards = realComplianceEngine.getStandards();
// {
//   'AS/NZS 3000': { title: '...', criticalRequirements: [...] },
//   'AS/NZS 5033': { ... }
// }
```

**Returns**: Standards object

---

**`getStatus()`**
Get compliance engine status.

```javascript
const status = realComplianceEngine.getStatus();
// {
//   initialized: true,
//   standards: 4,
//   verifications: 23,
//   passRate: 87,
//   criticalIssues: 3
// }
```

**Returns**: Status object

---

## Events

### System Events

**`central-data-ready`**
Fired when all core data loaded.

```javascript
window.addEventListener('central-data-ready', (e) => {
    const { minions, cerProducts, standards } = e.detail;
    initializeApp(minions, cerProducts);
});
```

---

**`credits-awarded`**
Fired when credits awarded.

```javascript
window.addEventListener('credits-awarded', (e) => {
    const { minionId, amount, reason } = e.detail;
    showNotification(`${minionId} earned ${amount} credits`);
});
```

---

**`health-metrics-update`**
Fired when health metrics update (every 15s).

```javascript
window.addEventListener('health-metrics-update', (e) => {
    const { overallHealth } = e.detail;
    updateHealthDisplay(overallHealth.score);
});
```

---

**`minion-work-completed`**
Fired when minion completes work.

```javascript
window.addEventListener('minion-work-completed', (e) => {
    const { minionId, credits } = e.detail;
    addActivity(minionId, 'Completed task', credits);
});
```

---

## Rate Limiters

Global rate limiters available via `window.rateLimiters`:

```javascript
// Check if operation allowed
if (rateLimiters.creditAward()) {
    // Award credits
} else {
    console.warn('Rate limit exceeded');
}
```

**Configured Limits**:
- `creditAward`: 60 per minute
- `localStorage`: 100 per minute
- `apiCall`: 30 per minute
- `stateUpdate`: 10 per second

---

## Data Structures

### Minion Object

```javascript
{
    id: 'ATLAS',
    name: 'ATLAS',
    tier: 1,
    specialty: 'Architecture',
    role: 'Alpha Worker',
    unifiedState: {
        credits: 2450,
        documentsProcessed: 47,
        tasksCompleted: 123,
        hoursWorked: 156.5,
        reputation: 0.92,
        happiness: 0.88
    },
    workStatus: {
        currentShift: 'Alpha',
        isWorking: true,
        onBreak: false,
        currentTask: 'Processing Fronius Primo',
        productivity: 0.95
    }
}
```

---

### Credit Record

```javascript
{
    minionId: 'ATLAS',
    amount: 25,
    reason: 'Document Processing',
    timestamp: 1707368400000,
    metadata: {
        product: 'Fronius Primo'
    }
}
```

---

### Health Metrics

```javascript
{
    overallHealth: {
        score: 85,
        status: 'excellent',
        color: '#4caf50',
        timestamp: 1707368400000
    },
    performance: {
        memory: {
            used: 47234560,
            total: 104857600,
            limit: 2147483648,
            usagePercent: 2.2
        }
    },
    network: {
        onLine: true,
        latency: 45,
        connection: {
            effectiveType: '4g',
            downlink: 10,
            rtt: 50
        }
    }
}
```

---

## Error Codes

### Security Errors

- **INVALID_MINION_ID**: Minion ID validation failed
- **INVALID_CREDIT_AMOUNT**: Credit amount out of range
- **RATE_LIMIT_EXCEEDED**: Too many requests
- **XSS_DETECTED**: Potential XSS attack blocked

### Performance Warnings

- **SLOW_RENDER**: Render took >16ms
- **SLOW_API**: API call took >1000ms
- **HIGH_MEMORY**: Memory usage >50%
- **LONG_TASK**: Task blocked main thread >50ms

### Data Errors

- **LOAD_FAILED**: Failed to load data file
- **PARSE_ERROR**: JSON parse failed
- **CACHE_MISS**: Requested data not in cache
- **STORAGE_QUOTA**: localStorage quota exceeded

---

## Best Practices

### Data Loading

```javascript
// ✅ GOOD: Use Central Data Loader
const minions = await centralDataLoader.loadMinions();

// ❌ BAD: Direct fetch
const minions = await fetch('./minions.json').then(r => r.json());
```

### Credit Awards

```javascript
// ✅ GOOD: Use Unified Credit System
unifiedCreditSystem.awardCredits('ATLAS', 25, 'Work completed');

// ❌ BAD: Direct state manipulation
minion.credits += 25;
```

### Input Validation

```javascript
// ✅ GOOD: Validate before using
if (securityUtils.validateMinionId(id)) {
    processMinion(id);
}

// ❌ BAD: No validation
processMinion(userInput);
```

### Performance Tracking

```javascript
// ✅ GOOD: Wrap API calls
const data = await performanceMonitor.measureAPICall('fetch', fetchPromise);

// ❌ BAD: No tracking
const data = await fetchPromise;
```

### Error Handling

```javascript
// ✅ GOOD: Use error boundary
const safeFn = errorHandler.createErrorBoundary(riskyFn);

// ❌ BAD: Bare try-catch
try { riskyFn(); } catch(e) { /* silent */ }
```

---

## Migration Guide

### From v2.2 to v2.3

**Breaking Changes**: None - all changes backward compatible

**Recommended Updates**:

1. **Replace direct data loading**:
```javascript
// Old
const minions = await fetch('./minions.json').then(r => r.json());

// New
const minions = await centralDataLoader.loadMinions();
```

2. **Replace credit calculations**:
```javascript
// Old
const credits = 10 + Math.random() * 15;

// New
const credits = unifiedCreditSystem.calculateDocumentProcessingCredits(minion, doc);
unifiedCreditSystem.awardCredits(minion.id, credits, 'Document Processing');
```

3. **Add input validation**:
```javascript
// Add before processing user input
if (!securityUtils.validateMinionId(id)) {
    console.error('Invalid ID');
    return;
}
```

---

For more examples, see the `/docs` folder source code.