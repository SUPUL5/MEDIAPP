import { useRef, useState, useCallback } from 'react';
import { FlatList, InteractionManager, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { ChatMessage } from '../types'; // Adjust path

interface UseAutoScrollOutput {
  flatListRef: React.RefObject<FlatList<ChatMessage>>;
  triggerScroll: (animated?: boolean) => void;
  handleContentSizeChange: () => void;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  handleTouchStart: () => void;
  handleTouchEnd: () => void;
  onMomentumScrollBegin: () => void;
  onMomentumScrollEnd: () => void;
}

export const useAutoScroll = (): UseAutoScrollOutput => {
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const [needsScroll, setNeedsScroll] = useState(false);
  const interactionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isManualScrolling = useRef(false);
  const currentScrollX = useRef(0); // Track horizontal scroll if needed, but usually vertical

  const scrollToBottom = useCallback((animated = true) => {
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated });
        //   console.log("[useAutoScroll] Scrolled to bottom");
          setNeedsScroll(false); // Reset flag
        } else {
        //   console.log("[useAutoScroll] Scroll attempted but FlatList ref not available.");
        }
      }, 100); // Consistent timeout
    });
  }, []);

  const triggerScroll = useCallback((animated = true) => {
    // console.log("[useAutoScroll] Scroll triggered.");
    setNeedsScroll(true);
    scrollToBottom(animated);
  }, [scrollToBottom]);

  const handleContentSizeChange = useCallback(() => {
    if (needsScroll) {
    //   console.log("[useAutoScroll] Scrolling due to content size change.");
      scrollToBottom();
    }
  }, [needsScroll, scrollToBottom]);

  const stopInteractionTimer = useCallback(() => {
    if (interactionTimerRef.current) {
      clearTimeout(interactionTimerRef.current);
      interactionTimerRef.current = null;
    }
  }, []);

  const startOrRestartSequence = useCallback(() => {
    stopInteractionTimer();
    interactionTimerRef.current = setTimeout(() => {
      isManualScrolling.current = false; // Assume interaction ended
      // Optional: Add logic here if you need to re-center or do something after idle
      // console.log("[useAutoScroll] Scroll interaction ended.");
    }, 300); // Shorter timeout just to reset flag
  }, [stopInteractionTimer]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    currentScrollX.current = event.nativeEvent.contentOffset.x; // Or y if needed
    // If actively being scrolled by user, reset timer
    if (isManualScrolling.current) {
      stopInteractionTimer();
    }
  };

  const handleTouchStart = () => {
    // console.log("[useAutoScroll] Touch Start - Manual Scroll Begin");
    isManualScrolling.current = true;
    stopInteractionTimer();
  };

  const handleMomentumScrollBegin = () => {
    // console.log("[useAutoScroll] Momentum Begin - Manual Scroll");
    isManualScrolling.current = true;
    stopInteractionTimer();
  };

  const handleMomentumScrollEnd = () => {
    // console.log("[useAutoScroll] Momentum End - Starting idle timer");
    startOrRestartSequence(); // Start timer to reset manual flag
  };

  const handleTouchEnd = () => {
    // console.log("[useAutoScroll] Touch End - Starting idle timer");
    startOrRestartSequence(); // Start timer to reset manual flag
  };

  return {
    flatListRef,
    triggerScroll,
    handleContentSizeChange,
    handleScroll,
    handleTouchStart,
    handleTouchEnd,
    onMomentumScrollBegin: handleMomentumScrollBegin,
    onMomentumScrollEnd: handleMomentumScrollEnd,
  };
};