import { FloatingWhatsApp } from './FloatingWhatsApp';
import { FloatingGlovo } from './FloatingGlovo';
import { FloatingDeliveroo } from './FloatingDeliveroo';
import { FloatingJustEat } from './FloatingJustEat';

interface FloatingDeliveryButtonsProps {
  whatsapp?: string;
  whatsappButtonColor?: string;
  whatsappIconColor?: string;
  glovo?: string;
  deliveroo?: string;
  justeat?: string;
}

export const FloatingDeliveryButtons = ({
  whatsapp,
  whatsappButtonColor,
  whatsappIconColor,
  glovo,
  deliveroo,
  justeat,
}: FloatingDeliveryButtonsProps) => {
  // Conta quanti pulsanti sono visibili
  const visibleButtons = [
    !!whatsapp,
    !!glovo,
    !!deliveroo,
    !!justeat,
  ].filter(Boolean).length;

  // Calcola la posizione bottom per ogni pulsante (spaziati verticalmente)
  const getBottomPosition = (index: number) => {
    const baseBottom = 24;
    const spacing = 76; // 60px button + 16px spacing
    return baseBottom + (visibleButtons - 1 - index) * spacing;
  };

  let buttonIndex = 0;

  return (
    <>
      {whatsapp && (
        <div style={{ position: 'fixed', bottom: `${getBottomPosition(buttonIndex++)}px`, right: '24px', zIndex: 1000 }}>
          <FloatingWhatsApp
            phoneNumber={whatsapp}
            buttonColor={whatsappButtonColor}
            iconColor={whatsappIconColor}
          />
        </div>
      )}
      {glovo && (
        <div style={{ position: 'fixed', bottom: `${getBottomPosition(buttonIndex++)}px`, right: '24px', zIndex: 1000 }}>
          <FloatingGlovo url={glovo} />
        </div>
      )}
      {deliveroo && (
        <div style={{ position: 'fixed', bottom: `${getBottomPosition(buttonIndex++)}px`, right: '24px', zIndex: 1000 }}>
          <FloatingDeliveroo url={deliveroo} />
        </div>
      )}
      {justeat && (
        <div style={{ position: 'fixed', bottom: `${getBottomPosition(buttonIndex++)}px`, right: '24px', zIndex: 1000 }}>
          <FloatingJustEat url={justeat} />
        </div>
      )}
    </>
  );
};
