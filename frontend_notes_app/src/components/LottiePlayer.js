import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web';

const LottiePlayer = ({ animationData, style, className }) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const reduceMotion = document.body?.dataset?.reduceMotion === '1';
    const anim = lottie.loadAnimation({
      container: el,
      renderer: 'svg',
      loop: true,
      autoplay: !reduceMotion,
      animationData,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet',
      },
    });
    if (reduceMotion) {
      try {
        anim.goToAndStop(0, true);
      } catch (e) {}
    }
    return () => {
      try {
        anim.destroy();
      } catch (e) {}
    };
  }, [animationData]);

  return <div ref={ref} className={className} style={style} />;
};

export default LottiePlayer;

