import { useState } from 'react';
import { IconQuestionMark } from '@tabler/icons-react';
import { SocialCircles } from './SocialCircles';
import styles from './SocialButton.module.css';
import { usableDeliveryUrl, usableWhatsApp } from '@/utils/socialLinks';

interface SocialButtonProps {
  whatsapp?: string;
  whatsappButtonColor?: string;
  whatsappIconColor?: string;
  glovo?: string;
  deliveroo?: string;
  justeat?: string;
  buttonColor?: string;
  iconColor?: string;
}

export const SocialButton = ({
  whatsapp,
  whatsappButtonColor,
  whatsappIconColor,
  glovo,
  deliveroo,
  justeat,
  buttonColor = '#6366f1',
  iconColor = '#ffffff',
}: SocialButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Conta quanti social sono disponibili
  const wa = usableWhatsApp(whatsapp);
  const glovoUrl = usableDeliveryUrl(glovo, 'glovo');
  const deliverooUrl = usableDeliveryUrl(deliveroo, 'deliveroo');
  const justeatUrl = usableDeliveryUrl(justeat, 'justeat');
  const hasSocials = !!(wa || glovoUrl || deliverooUrl || justeatUrl);

  if (!hasSocials) {
    return null;
  }

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={styles.socialButtonContainer}>
      <SocialCircles
        isOpen={isOpen}
        whatsapp={wa}
        whatsappButtonColor={whatsappButtonColor}
        whatsappIconColor={whatsappIconColor}
        glovo={glovoUrl}
        deliveroo={deliverooUrl}
        justeat={justeatUrl}
      />
      <button
        onClick={toggleOpen}
        className={styles.socialButton}
        style={{
          backgroundColor: buttonColor,
          color: iconColor,
        }}
        aria-label={isOpen ? 'Chiudi social' : 'Apri social'}
      >
        <IconQuestionMark size={24} stroke={2.5} />
      </button>
    </div>
  );
};
