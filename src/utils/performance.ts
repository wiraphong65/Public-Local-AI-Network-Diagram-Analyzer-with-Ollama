// Performance optimization utilities for the network topology app
import { useState } from 'react';

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Measure component render time
  public startMeasure(componentName: string): string {
    const measureId = `${componentName}-${Date.now()}`;
    performance.mark(`${measureId}-start`);
    return measureId;
  }

  public endMeasure(measureId: string, componentName: string): number {
    const endMark = `${measureId}-end`;
    performance.mark(endMark);
    performance.measure(measureId, `${measureId}-start`, endMark);
    
    const measure = performance.getEntriesByName(measureId)[0];
    const duration = measure?.duration || 0;
    
    // Store metrics
    if (!this.metrics.has(componentName)) {
      this.metrics.set(componentName, []);
    }
    this.metrics.get(componentName)!.push(duration);
    
    // Clean up
    performance.clearMarks(`${measureId}-start`);
    performance.clearMarks(endMark);
    performance.clearMeasures(measureId);
    
    return duration;
  }

  // Get performance statistics
  public getStats(componentName: string) {
    const times = this.metrics.get(componentName) || [];
    if (times.length === 0) return null;

    const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
    const max = Math.max(...times);
    const min = Math.min(...times);
    
    return {
      average: Math.round(avg * 100) / 100,
      max: Math.round(max * 100) / 100,
      min: Math.round(min * 100) / 100,
      count: times.length
    };
  }

  // Clear metrics for a component
  public clearMetrics(componentName: string) {
    this.metrics.delete(componentName);
  }

  // Get all performance data
  public getAllStats() {
    const stats: Record<string, any> = {};
    for (const [componentName] of this.metrics) {
      stats[componentName] = this.getStats(componentName);
    }
    return stats;
  }
}

// Debounce utility for expensive operations
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

// Throttle utility for frequent events
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Memoization utility
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map();
  
  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    // Limit cache size
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  }) as T;
}

// Virtual scrolling utility for large lists
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight),
    items.length - 1
  );
  
  const paddedStart = Math.max(0, visibleStart - overscan);
  const paddedEnd = Math.min(items.length - 1, visibleEnd + overscan);
  
  const visibleItems = items.slice(paddedStart, paddedEnd + 1);
  const offsetY = paddedStart * itemHeight;
  const totalHeight = items.length * itemHeight;
  
  return {
    visibleItems,
    offsetY,
    totalHeight,
    setScrollTop,
    visibleRange: { start: paddedStart, end: paddedEnd }
  };
}

export default PerformanceMonitor;