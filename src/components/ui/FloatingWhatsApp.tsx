import { useEffect, useState } from 'react';
import { IconBrandWhatsapp } from '@tabler/icons-react';

interface FloatingWhatsAppProps {
  phoneNumber?: string;
  buttonColor?: string;
  iconColor?: string;
}

export const FloatingWhatsApp = ({ 
  phoneNumber, 
  buttonColor = '#25D366', 
  iconColor = '#ffffff' 
}: FloatingWhatsAppProps) => {
  const [isVisible, setIsVisible] = useState(false);

  // Mostra il pulsante solo se c'è un numero di telefono
  useEffect(() => {
    setIsVisible(!!phoneNumber);
  }, [phoneNumber]);

  if (!isVisible || !phoneNumber) {
    return null;
  }

  // Formatta il numero rimuovendo spazi, trattini e caratteri speciali
  const formatPhoneNumber = (phone: string) => {
    return phone.replace(/[^0-9+]/g, '');
  };

  const handleClick = () => {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const whatsappUrl = `https://wa.me/${formattedPhone}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handleClick}
      style={{
        position: 'relative',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        backgroundColor: buttonColor,
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
      aria-label="Contattaci su WhatsApp"
    >
      <IconBrandWhatsapp 
        size={32} 
        color={iconColor}
        stroke={2}
      />
    </button>
  );
};
