import { useEffect, useState } from 'react';

interface FloatingDeliverooProps {
  url?: string;
}

export const FloatingDeliveroo = ({ url }: FloatingDeliverooProps) => {
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
        backgroundColor: '#FFFFFF',
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
      aria-label="Ordina su Deliveroo"
    >
      <img
        src="/uploads/deliveroo-svgrepo-com.svg"
        alt="Deliveroo"
        width={32}
        height={32}
        style={{ objectFit: 'contain', filter: 'brightness(0) saturate(100%) invert(45%) sepia(93%) saturate(1352%) hue-rotate(141deg) brightness(101%) contrast(101%)' }}
      />
    </button>
  );
};
