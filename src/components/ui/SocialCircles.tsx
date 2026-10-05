import { FloatingWhatsApp } from './FloatingWhatsApp';
import { FloatingGlovo } from './FloatingGlovo';
import { FloatingDeliveroo } from './FloatingDeliveroo';
import { FloatingJustEat } from './FloatingJustEat';
import styles from './SocialCircles.module.css';

interface SocialCirclesProps {
  isOpen: boolean;
  whatsapp?: string;
  whatsappButtonColor?: string;
  whatsappIconColor?: string;
  glovo?: string;
  deliveroo?: string;
  justeat?: string;
}

export const SocialCircles = ({
  isOpen,
  whatsapp,
  whatsappButtonColor,
  whatsappIconColor,
  glovo,
  deliveroo,
  justeat,
}: SocialCirclesProps) => {
  // Conta quanti pulsanti sono visibili
  const visibleButtons = [
    !!whatsapp,
    !!glovo,
    !!deliveroo,
    !!justeat,
  ].filter(Boolean).length;

  // Calcola la posizione bottom per ogni pulsante (spaziati verticalmente)
  const getBottomPosition = (index: number) => {
    const baseBottom = 100; // Spazio sopra il bottone principale
    const spacing = 76; // 60px button + 16px spacing
    return baseBottom + (visibleButtons - 1 - index) * spacing;
  };

  let buttonIndex = 0;

  return (
    <div className={`${styles.socialCirclesContainer} ${isOpen ? styles.open : styles.closed}`}>
      {whatsapp && (
        <div 
          className={styles.socialCircle}
          style={{ 
            bottom: `${getBottomPosition(buttonIndex)}px`,
            opacity: isOpen ? 1 : 0,
            visibility: isOpen ? 'visible' : 'hidden',
            transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.8)',
            pointerEvents: isOpen ? 'auto' : 'none',
            transitionDelay: isOpen ? `${(buttonIndex++) * 0.1}s` : `${(visibleButtons - buttonIndex++) * 0.05}s`,
          }}
        >
          <FloatingWhatsApp
            phoneNumber={whatsapp}
            buttonColor={whatsappButtonColor}
            iconColor={whatsappIconColor}
          />
        </div>
      )}
      {glovo && (
        <div 
          className={styles.socialCircle}
          style={{ 
            bottom: `${getBottomPosition(buttonIndex)}px`,
            opacity: isOpen ? 1 : 0,
            visibility: isOpen ? 'visible' : 'hidden',
            transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.8)',
            pointerEvents: isOpen ? 'auto' : 'none',
            transitionDelay: isOpen ? `${(buttonIndex++) * 0.1}s` : `${(visibleButtons - buttonIndex++) * 0.05}s`,
          }}
        >
          <FloatingGlovo url={glovo} />
        </div>
      )}
      {deliveroo && (
        <div 
          className={styles.socialCircle}
          style={{ 
            bottom: `${getBottomPosition(buttonIndex)}px`,
            opacity: isOpen ? 1 : 0,
            visibility: isOpen ? 'visible' : 'hidden',
            transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.8)',
            pointerEvents: isOpen ? 'auto' : 'none',
            transitionDelay: isOpen ? `${(buttonIndex++) * 0.1}s` : `${(visibleButtons - buttonIndex++) * 0.05}s`,
          }}
        >
          <FloatingDeliveroo url={deliveroo} />
        </div>
      )}
      {justeat && (
        <div 
          className={styles.socialCircle}
          style={{ 
            bottom: `${getBottomPosition(buttonIndex)}px`,
            opacity: isOpen ? 1 : 0,
            visibility: isOpen ? 'visible' : 'hidden',
            transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.8)',
            pointerEvents: isOpen ? 'auto' : 'none',
            transitionDelay: isOpen ? `${(buttonIndex++) * 0.1}s` : `${(visibleButtons - buttonIndex++) * 0.05}s`,
          }}
        >
          <FloatingJustEat url={justeat} />
        </div>
      )}
    </div>
  );
};
