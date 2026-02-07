class MetricsRegistry {
  constructor() {
    this.startedAt = new Date().toISOString();
    this.requestCount = 0;
    this.statusCounter = new Map();
    this.routeCounter = new Map();
    this.latencyAccumulatorMs = 0;
  }

  recordRequest(result) {
    this.requestCount += 1;

    const statusCode = String(result.statusCode ?? 0);
    this.statusCounter.set(statusCode, (this.statusCounter.get(statusCode) ?? 0) + 1);

    const routeKey = `${result.method ?? 'GET'} ${result.route ?? 'unknown'}`;
    this.routeCounter.set(routeKey, (this.routeCounter.get(routeKey) ?? 0) + 1);

    this.latencyAccumulatorMs += Math.max(0, result.durationMs ?? 0);
  }

  snapshot() {
    const averageLatencyMs = this.requestCount > 0
      ? Number.parseFloat((this.latencyAccumulatorMs / this.requestCount).toFixed(2))
      : 0;

    return {
      startedAt: this.startedAt,
      totalRequests: this.requestCount,
      averageLatencyMs,
      statuses: Object.fromEntries(this.statusCounter.entries()),
      routes: Object.fromEntries(this.routeCounter.entries())
    };
  }
}

module.exports = {
  MetricsRegistry
};