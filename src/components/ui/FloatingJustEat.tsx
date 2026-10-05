import { useEffect, useState } from 'react';

interface FloatingJustEatProps {
  url?: string;
}

export const FloatingJustEat = ({ url }: FloatingJustEatProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(!!url);
  }, [url]);

  if (!isVisible || !url) {
    return null;
  }

  const handleClick = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handleClick}
      style={{
        position: 'relative',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        backgroundColor: '#FE8000',
        border: 'none',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
      }}
      aria-label="Ordina su Just Eat"
    >
      <img
        src="/uploads/justeat-svgrepo-com.svg"
        alt="Just Eat"
        width={32}
        height={32}
        style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
      />
    </button>
  );
};
