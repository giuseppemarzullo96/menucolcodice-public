import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { Menu, theme } from "antd";

import styles from "../../styles/sidebar.module.css";
import menuStyles from "../../styles/sidebar-menu-colors.module.css";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

export const MenuItems = ({ isDrawerOpen, setOpenDrawer, themeColors }: any) => {
  const router = useRouter();
  const [menuOptions, setMenuOptions] = useState<any[]>([]);
  const [currentSection, setCurrentSection] = useState("");
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const { useToken } = theme;
  const { token } = useToken();
  
  // Carica le categorie dinamicamente
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/get-categories?hideEmpty=1');
        if (response.ok) {
          const data = await response.json();
          // Ordina le categorie per order (se presente) prima di mapparle
          const sortedCategories = [...data.categories].sort((a: any, b: any) => {
            const orderA = a.order !== undefined ? a.order : 999;
            const orderB = b.order !== undefined ? b.order : 999;
            return orderA - orderB;
          });
          
          const options = sortedCategories.map((cat: any) => ({
            key: cat.key,
            icon: <CategoryIcon icon={cat.icon} size={16} />,
            label: cat.name,
          }));
          setMenuOptions(options);
          if (options.length > 0) {
            setCurrentSection((prev) => prev || options[0].key);
          }
        }
      } catch (error) {
        console.error('Errore nel caricare le categorie:', error);
      }
    };
    loadCategories();
  }, []);
  
  useEffect(() => {
    const handleScroll = () => {
      // Find all sections in the main layout
      const sections = document.querySelectorAll("section");

      // Determine the current section in view
      // Trova la sezione più vicina alla parte superiore della viewport
      let newCurrentSection = null;
      let minDistance = Infinity;

      sections.forEach((section) => {
        if (!section.id) return;
        const rect = section.getBoundingClientRect();
        // Se la sezione è visibile nella viewport (con un offset per la navbar)
        // Considera una sezione "attiva" se è nella parte superiore della viewport
        if (rect.top <= 300 && rect.bottom >= 100) {
          // Calcola la distanza dalla parte superiore della viewport
          const distance = Math.abs(rect.top - 100); // Offset per navbar
          if (distance < minDistance) {
            minDistance = distance;
            newCurrentSection = section.id;
          }
        }
      });
      
      // Debug: log per verificare cosa viene trovato
      if (newCurrentSection) {
        console.log('MenuItems - Sezione trovata:', newCurrentSection);
      }

      // Update the current section in state solo se è cambiata
      if (newCurrentSection) {
        setCurrentSection((prev) => {
          if (prev !== newCurrentSection) {
            return newCurrentSection;
          }
          return prev;
        });
      }
    };

    // Gestisci l'hash nell'URL quando la pagina viene caricata o cambia
    if (router.pathname === '/dishes') {
      const hash = router.asPath.split('#')[1];
      if (hash) {
        setCurrentSection(hash);
        // Scroll alla sezione dopo un breve delay per permettere il rendering
        setTimeout(() => {
          const section = document.getElementById(hash);
          if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else {
        // Se non c'è hash, esegui handleScroll per trovare la sezione visibile
        setTimeout(() => {
          handleScroll();
        }, 100);
      }
    }

    // Esegui handleScroll una volta all'inizio per impostare la sezione iniziale
    const initialTimeout = setTimeout(() => {
      handleScroll();
    }, 200);

    // Attach scroll event listener con throttling
    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", throttledHandleScroll, { passive: true });

    // Clean up event listener on component unmount
    return () => {
      clearTimeout(initialTimeout);
      window.removeEventListener("scroll", throttledHandleScroll);
    };
  }, [router.pathname]);

  const handleMenuClick = async (e) => {
    const sectionId = e.key;
    
    console.log('MenuItems - Click su:', sectionId);
    
    // Chiudi immediatamente il drawer se aperto
    if (isDrawerOpen) {
      setOpenDrawer(false);
    }
    
    // Imposta immediatamente la sezione corrente
    setCurrentSection(sectionId);
    
    // Aggiorna l'hash nell'URL senza ricaricare la pagina
    if (typeof window !== 'undefined' && window.parent === window) {
      window.history.pushState(null, '', `#${sectionId}`);
    }
    
    // Verifica se siamo già sulla pagina /dishes
    if (router.pathname === '/dishes') {
      // Aspetta che il drawer si chiuda completamente prima di scrollare
      setTimeout(() => {
        const section = document.getElementById(sectionId);
        console.log('MenuItems - Cercando sezione con ID:', sectionId, 'Trovata:', !!section);
        if (section) {
          section.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
        } else {
          console.warn('MenuItems - Sezione non trovata con ID:', sectionId);
          // Prova a trovare tutte le sezioni per debug
          const allSections = document.querySelectorAll('section');
          console.log('MenuItems - Sezioni disponibili:', Array.from(allSections).map(s => s.id));
        }
      }, isDrawerOpen ? 350 : 50); // Tempo per l'animazione di chiusura del drawer
    } else {
      // Naviga a /dishes con l'hash della sezione
      await router.push(`/dishes#${sectionId}`);
    }
  };
  
  const sidebarColors = themeColors?.sidebar || {};
  const menuItemBackground = sidebarColors.menuItemBackground || '#401b0e';
  const menuItemColor = sidebarColors.menuItemColor || '#ffffff';
  const menuItemActive = sidebarColors.menuItemActive || '#FFB800';
  const menuItemHover = sidebarColors.menuItemHover || '#FFE5B4';
  const iconColor = sidebarColors.iconColor || '#FFB800';

  // Aggiorna le variabili CSS quando cambiano i colori
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--menu-item-background', menuItemBackground);
      document.documentElement.style.setProperty('--menu-item-color', menuItemColor);
      document.documentElement.style.setProperty('--menu-item-active', menuItemActive);
      document.documentElement.style.setProperty('--menu-item-hover', menuItemHover);
      document.documentElement.style.setProperty('--icon-color', iconColor);
    }
  }, [menuItemBackground, menuItemColor, menuItemActive, menuItemHover, iconColor]);

  return (
    <>
      <Menu
        className={`${styles.menuContainer} ${menuStyles.menuContainer}`}
        mode="inline"
        selectedKeys={[currentSection]}
        onClick={handleMenuClick}
        items={menuOptions.map((option) => ({
          key: option.key,
          icon: option.icon,
          label: option.label,
        }))}
        style={{
          '--menu-item-background': menuItemBackground,
          '--menu-item-color': menuItemColor,
          '--menu-item-active': menuItemActive,
          '--menu-item-hover': menuItemHover,
          '--icon-color': iconColor,
          background: menuItemBackground,
          backgroundColor: menuItemBackground,
        } as React.CSSProperties}
      />
    </>
  );
};
