import CircuitBreaker from 'opossum';

interface CircuitBreakerOptions {
  timeout: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
  volumeThreshold: number;
}

interface CircuitState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  successes: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
}

const defaultOptions: CircuitBreakerOptions = {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 10
};

class DatabaseCircuitBreaker {
  private static instance: DatabaseCircuitBreaker;
  private breakers: Map<string, CircuitBreaker<any[], any>> = new Map();
  private states: Map<string, CircuitState> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private onStateChangeCallbacks: ((name: string, state: string) => void)[] = [];

  private constructor() {
    this.startHealthMonitor();
  }

  static getInstance(): DatabaseCircuitBreaker {
    if (!DatabaseCircuitBreaker.instance) {
      DatabaseCircuitBreaker.instance = new DatabaseCircuitBreaker();
    }
    return DatabaseCircuitBreaker.instance;
  }

  createBreaker<T>(
    name: string,
    action: (...args: any[]) => Promise<T>,
    options: Partial<CircuitBreakerOptions> = {}
  ): CircuitBreaker<any[], T> {
    if (this.breakers.has(name)) {
      return this.breakers.get(name)!;
    }

    const mergedOptions = { ...defaultOptions, ...options };
    
    const breaker = new CircuitBreaker(action, {
      timeout: mergedOptions.timeout,
      errorThresholdPercentage: mergedOptions.errorThresholdPercentage,
      resetTimeout: mergedOptions.resetTimeout,
      volumeThreshold: mergedOptions.volumeThreshold,
      name: name
    });

    this.states.set(name, {
      state: 'CLOSED',
      failures: 0,
      successes: 0,
      lastFailure: null,
      lastSuccess: null
    });

    breaker.on('open', () => {
      console.log(`🔴 [CircuitBreaker] ${name}: OPEN - تم فتح الدائرة بسبب فشل متكرر`);
      this.updateState(name, 'OPEN');
      this.notifyStateChange(name, 'OPEN');
    });

    breaker.on('halfOpen', () => {
      console.log(`🟡 [CircuitBreaker] ${name}: HALF_OPEN - جاري اختبار الاتصال`);
      this.updateState(name, 'HALF_OPEN');
      this.notifyStateChange(name, 'HALF_OPEN');
    });

    breaker.on('close', () => {
      console.log(`🟢 [CircuitBreaker] ${name}: CLOSED - تم استعادة الاتصال`);
      this.updateState(name, 'CLOSED');
      this.notifyStateChange(name, 'CLOSED');
    });

    breaker.on('success', () => {
      const state = this.states.get(name);
      if (state) {
        state.successes++;
        state.lastSuccess = new Date();
      }
    });

    breaker.on('failure', () => {
      const state = this.states.get(name);
      if (state) {
        state.failures++;
        state.lastFailure = new Date();
      }
    });

    breaker.on('timeout', () => {
      console.warn(`⏱️ [CircuitBreaker] ${name}: Timeout - انتهت المهلة الزمنية`);
    });

    breaker.on('reject', () => {
      console.warn(`🚫 [CircuitBreaker] ${name}: Rejected - تم رفض الطلب (الدائرة مفتوحة)`);
    });

    breaker.fallback(() => {
      console.log(`🔄 [CircuitBreaker] ${name}: Fallback - تفعيل الوضع البديل`);
      return null;
    });

    this.breakers.set(name, breaker);
    return breaker;
  }

  private updateState(name: string, newState: 'CLOSED' | 'OPEN' | 'HALF_OPEN') {
    const state = this.states.get(name);
    if (state) {
      state.state = newState;
    }
  }

  private notifyStateChange(name: string, state: string) {
    this.onStateChangeCallbacks.forEach(cb => cb(name, state));
  }

  onStateChange(callback: (name: string, state: string) => void) {
    this.onStateChangeCallbacks.push(callback);
  }

  async execute<T>(name: string, ...args: any[]): Promise<T | null> {
    const breaker = this.breakers.get(name);
    if (!breaker) {
      throw new Error(`Circuit breaker '${name}' not found`);
    }

    try {
      return await breaker.fire(...args);
    } catch (error: any) {
      if (error.code === 'EOPENBREAKER') {
        console.log(`⚡ [CircuitBreaker] ${name}: Fast-fail - الدائرة مفتوحة`);
        return null;
      }
      throw error;
    }
  }

  getState(name: string): CircuitState | undefined {
    return this.states.get(name);
  }

  getAllStates(): Record<string, CircuitState> {
    const result: Record<string, CircuitState> = {};
    this.states.forEach((state, name) => {
      result[name] = { ...state };
    });
    return result;
  }

  getStats(name: string): any {
    const breaker = this.breakers.get(name);
    if (!breaker) return null;
    return breaker.stats;
  }

  isOpen(name: string): boolean {
    const breaker = this.breakers.get(name);
    return breaker ? breaker.opened : false;
  }

  isClosed(name: string): boolean {
    const breaker = this.breakers.get(name);
    return breaker ? breaker.closed : false;
  }

  reset(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.close();
      const state = this.states.get(name);
      if (state) {
        state.state = 'CLOSED';
        state.failures = 0;
      }
      console.log(`🔄 [CircuitBreaker] ${name}: تم إعادة تعيين الدائرة`);
    }
  }

  resetAll(): void {
    this.breakers.forEach((_, name) => this.reset(name));
  }

  private startHealthMonitor() {
    this.healthCheckInterval = setInterval(() => {
      this.breakers.forEach((breaker, name) => {
        const state = this.states.get(name);
        if (state && breaker.opened) {
          console.log(`🔍 [HealthMonitor] ${name}: الدائرة مفتوحة منذ ${state.lastFailure?.toISOString()}`);
        }
      });
    }, 60000);
  }

  stopHealthMonitor() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  getHealthReport(): {
    totalBreakers: number;
    openBreakers: string[];
    closedBreakers: string[];
    halfOpenBreakers: string[];
    overallHealth: 'healthy' | 'degraded' | 'critical';
  } {
    const openBreakers: string[] = [];
    const closedBreakers: string[] = [];
    const halfOpenBreakers: string[] = [];

    this.states.forEach((state, name) => {
      switch (state.state) {
        case 'OPEN':
          openBreakers.push(name);
          break;
        case 'CLOSED':
          closedBreakers.push(name);
          break;
        case 'HALF_OPEN':
          halfOpenBreakers.push(name);
          break;
      }
    });

    let overallHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const total = this.breakers.size;
    
    if (openBreakers.length === total && total > 0) {
      overallHealth = 'critical';
    } else if (openBreakers.length > 0) {
      overallHealth = 'degraded';
    }

    return {
      totalBreakers: total,
      openBreakers,
      closedBreakers,
      halfOpenBreakers,
      overallHealth
    };
  }
}

export const circuitBreaker = DatabaseCircuitBreaker.getInstance();
export { DatabaseCircuitBreaker, CircuitBreakerOptions, CircuitState };
