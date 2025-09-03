"use client";

import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  maxPullDistance?: number;
  resistance?: number;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPullDistance = 120,
  resistance = 0.6
}: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let isPulling = false;
    let animationFrameId: number;

    const handleTouchStart = (e: TouchEvent) => {
      if (element.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        isPulling = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return;

      currentY.current = e.touches[0].clientY;
      const pull = Math.max(0, currentY.current - startY.current);
      
      if (pull > 0) {
        e.preventDefault();
        const distance = Math.min(pull * resistance, maxPullDistance);
        setPullDistance(distance);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling || isRefreshing) return;

      isPulling = false;
      
      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
      
      // Animate back to 0
      const animate = () => {
        setPullDistance(prev => {
          const newDistance = prev * 0.8;
          if (newDistance < 1) {
            setPullDistance(0);
            return 0;
          }
          animationFrameId = requestAnimationFrame(animate);
          return newDistance;
        });
      };
      animate();
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [onRefresh, threshold, maxPullDistance, resistance, isRefreshing, pullDistance]);

  return {
    isRefreshing,
    pullDistance,
    elementRef,
    shouldShowRefreshIndicator: pullDistance > 0
  };
}
